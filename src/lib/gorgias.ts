import type {
  GorgiasGranularity,
  CSOverviewData,
  CSOverviewTimeSeries,
  ChannelDistributionData,
  ChannelStats,
  ChannelTimeSeries,
} from "@/types/gorgias";
import { CHANNEL_LABELS, CHANNEL_COLORS } from "@/types/gorgias";

// ============================================
// Gorgias REST API Client — Tickets-based
// ============================================

// --- In-memory cache (15 min TTL) + promise deduplication ---
const CACHE_TTL = 15 * 60 * 1000;
const cache = new Map<string, { data: unknown; expires: number }>();
const inflight = new Map<string, Promise<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL });
}

/** Deduplicate concurrent calls: if a fetch for the same key is already running, reuse it. */
async function dedupedFetch<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const cached = getCached<T>(key);
  if (cached) return cached;

  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = fn().then((result) => {
    setCache(key, result);
    inflight.delete(key);
    return result;
  }).catch((err) => {
    inflight.delete(key);
    throw err;
  });

  inflight.set(key, promise);
  return promise;
}

/** Fetch with retry + exponential backoff for 429 rate limits */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, options);
    if (res.status === 429 && attempt < retries) {
      const wait = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    return res;
  }
  throw new Error("Unreachable");
}

interface GorgiasTicket {
  id: number;
  status: string;
  channel: string;
  created_datetime: string;
  closed_datetime: string | null;
  messages_count: number;
  from_agent: boolean;
}

interface GorgiasView {
  id: number;
  name: string;
  slug: string;
  type: string;
}

export interface ViewTicketCount {
  id: number;
  name: string;
  slug: string;
  count: number;
}

interface GorgiasListResponse<T> {
  data: T[];
  meta: {
    next_cursor?: string | null;
    next_items?: string | null;
  };
}

function getGorgiasAuth(): { baseUrl: string; headers: Record<string, string> } {
  const domain = process.env.GORGIAS_DOMAIN;
  const email = process.env.GORGIAS_EMAIL;
  const apiKey = process.env.GORGIAS_API_KEY;

  if (!domain || !email || !apiKey) {
    throw new Error(
      "Gorgias niet geconfigureerd. Stel GORGIAS_DOMAIN, GORGIAS_EMAIL en GORGIAS_API_KEY in."
    );
  }

  const auth = Buffer.from(`${email}:${apiKey}`).toString("base64");
  return {
    baseUrl: `https://${domain}.gorgias.com`,
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
  };
}

/**
 * Fetch all tickets within a date range using cursor pagination.
 */
async function fetchAllTickets(from: string, to: string): Promise<GorgiasTicket[]> {
  return dedupedFetch(`tickets:${from}:${to}`, async () => {
    const { baseUrl, headers } = getGorgiasAuth();
    const all: GorgiasTicket[] = [];
    let cursor: string | null = null;

    const fromDate = new Date(from);
    const toDate = new Date(to);

    while (true) {
      const url = new URL(`${baseUrl}/api/tickets`);
      url.searchParams.set("limit", "100");
      url.searchParams.set("order_by", "created_datetime:desc");
      if (cursor) url.searchParams.set("cursor", cursor);

      const res = await fetchWithRetry(url.toString(), { headers });
      if (!res.ok) {
        throw new Error(`Gorgias API error ${res.status}: ${await res.text()}`);
      }

      const data: GorgiasListResponse<GorgiasTicket> = await res.json();

      for (const ticket of data.data) {
        const created = new Date(ticket.created_datetime);
        if (created < fromDate) return all;
        if (created <= toDate) all.push(ticket);
      }

      if (!data.meta.next_cursor || data.data.length === 0) break;
      cursor = data.meta.next_cursor;
      await new Promise((r) => setTimeout(r, 500));
    }

    return all;
  });
}

// ============================================
// Views — Open ticket counts per view
// ============================================

export async function fetchViewCounts(): Promise<ViewTicketCount[]> {
  return dedupedFetch("viewCounts", async () => {
    const { baseUrl, headers } = getGorgiasAuth();

    // 1. Get all views
    const viewsRes = await fetchWithRetry(`${baseUrl}/api/views?limit=100`, { headers });
    if (!viewsRes.ok) {
      throw new Error(`Gorgias views error: ${viewsRes.status}`);
    }
    const viewsData: GorgiasListResponse<GorgiasView> = await viewsRes.json();
    const views = viewsData.data.filter((v) => v.type === "ticket-list");

    // 2. Count items per view sequentially (1 at a time to respect rate limits)
    const counts: ViewTicketCount[] = [];

    for (const view of views) {
      let count = 0;
      let nextPage: string | null = null;
      let isFirst = true;

      while (true) {
        const url = new URL(`${baseUrl}/api/views/${view.id}/items`);
        url.searchParams.set("limit", "100");
        if (nextPage) url.searchParams.set("cursor", nextPage);

        const res = await fetchWithRetry(url.toString(), { headers });
        if (!res.ok) break;

        const data = await res.json();
        const items = data.data || [];
        count += items.length;

        // Stop if no more pages
        const cursor = data.meta?.next_items || data.meta?.next_cursor;
        if (!cursor || items.length < 100) break;
        nextPage = cursor;

        if (!isFirst) await new Promise((r) => setTimeout(r, 500));
        isFirst = false;
      }

      counts.push({ id: view.id, name: view.name, slug: view.slug, count });
      await new Promise((r) => setTimeout(r, 500));
    }

    return counts;
  });
}

// ============================================
// CS Overview — Direct from Gorgias Stats API
// ============================================

interface GorgiasOverviewStat {
  name: string;
  type: string;
  value: number;
  delta: number;
  more_is_better?: boolean;
}

interface GorgiasOverviewResponse {
  data: {
    data: GorgiasOverviewStat[];
  };
  meta: {
    start_datetime: string;
    end_datetime: string;
    previous_start_datetime: string;
    previous_end_datetime: string;
  };
}

async function fetchGorgiasOverviewStats(
  from: string,
  to: string
): Promise<GorgiasOverviewResponse> {
  const { baseUrl, headers } = getGorgiasAuth();
  const res = await fetchWithRetry(
    `${baseUrl}/api/stats/overview`,
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        filters: {
          period: {
            start_datetime: from,
            end_datetime: to,
          },
        },
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`Gorgias stats/overview error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export async function fetchCSOverview(
  from: string,
  to: string
): Promise<CSOverviewData> {
  return dedupedFetch(`overview:${from}:${to}`, async () => {
    const stats = await fetchGorgiasOverviewStats(from, to);
    const byName = new Map(stats.data.data.map((s) => [s.name, s]));

    const get = (name: string) => byName.get(name)?.value ?? 0;
    const getDelta = (name: string) => byName.get(name)?.delta ?? null;

    const created = get("total_new_tickets");
    const closed = get("total_closed_tickets");
    const replied = get("total_replied_tickets");
    const firstResponseTime = get("median_first_response_time");
    const resolutionTime = get("median_resolution_time");
    const oneTouchRate = get("total_one_touch_tickets"); // Already a percentage

    // Compute previous period values using delta (percentage change)
    const prevCreated = computePrevious(created, getDelta("total_new_tickets"));
    const prevClosed = computePrevious(closed, getDelta("total_closed_tickets"));
    const prevFRT = computePrevious(firstResponseTime, getDelta("median_first_response_time"));
    const prevRT = computePrevious(resolutionTime, getDelta("median_resolution_time"));

    return {
      ticketsCreated: created,
      ticketsClosed: closed,
      ticketsOpen: 0, // Will be overridden by view counts in the UI
      ticketsReplied: replied,
      oneTouchRate,
      zeroTouchRate: 0,
      automationRate: 0,
      avgFirstResponseTime: firstResponseTime,
      avgHumanFirstResponseTime: firstResponseTime,
      avgResponseTime: 0,
      avgResolutionTime: resolutionTime,
      avgHandleTime: 0,
      csatScore: null,
      csatResponseRate: 0,
      csatTotal: 0,
      slaComplianceRate: 0,
      previousPeriod: {
        ticketsCreated: prevCreated,
        ticketsClosed: prevClosed,
        avgFirstResponseTime: prevFRT,
        avgResolutionTime: prevRT,
        csatScore: null,
      },
    };
  });
}

/** Compute previous period absolute value from current value and delta percentage */
function computePrevious(current: number, deltaPercent: number | null): number {
  if (deltaPercent === null || deltaPercent === 0) return current;
  // delta is percentage change: ((current - previous) / previous) * 100
  // so: previous = current / (1 + delta/100)
  const factor = 1 + deltaPercent / 100;
  return factor !== 0 ? Math.round(current / factor) : current;
}

// ============================================
// CS Overview — Time Series (from Gorgias Stats)
// ============================================

export async function fetchCSOverviewTimeSeries(
  from: string,
  to: string,
  _granularity: GorgiasGranularity = "day"
): Promise<CSOverviewTimeSeries[]> {
  return dedupedFetch(`timeseries:${from}:${to}`, async () => {
    const { baseUrl, headers } = getGorgiasAuth();
    const res = await fetchWithRetry(
      `${baseUrl}/api/stats/support-volume`,
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          filters: {
            period: {
              start_datetime: from,
              end_datetime: to,
            },
          },
        }),
      }
    );
    if (!res.ok) {
      throw new Error(`Gorgias stats/support-volume error ${res.status}`);
    }
    const json = await res.json();
    const data = json.data?.data;
    if (!data?.axes?.x) return [];

    const timestamps: number[] = data.axes.x;
    const lines = data.lines as { name: string; data: number[] }[];

    const createdLine = lines.find((l) => l.name === "created")?.data || [];
    const closedLine = lines.find((l) => l.name === "closed")?.data || [];

    return timestamps.map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().slice(0, 10),
      ticketsCreated: createdLine[i] || 0,
      ticketsClosed: closedLine[i] || 0,
      avgFirstResponseTime: 0,
      avgResolutionTime: 0,
    }));
  });
}

// ============================================
// Channel Distribution
// ============================================

export async function fetchChannelDistribution(
  from: string,
  to: string
): Promise<ChannelDistributionData> {
  const tickets = await fetchAllTickets(from, to);

  const channelMap = new Map<
    string,
    { count: number; totalResolution: number; resolutionCount: number }
  >();

  for (const t of tickets) {
    const ch = t.channel;
    const entry = channelMap.get(ch) || {
      count: 0,
      totalResolution: 0,
      resolutionCount: 0,
    };
    entry.count++;

    if (t.status === "closed" && t.closed_datetime) {
      const diff =
        (new Date(t.closed_datetime).getTime() -
          new Date(t.created_datetime).getTime()) /
        1000;
      if (diff > 0) {
        entry.totalResolution += diff;
        entry.resolutionCount++;
      }
    }

    channelMap.set(ch, entry);
  }

  const totalTickets = tickets.length;

  const channels: ChannelStats[] = Array.from(channelMap.entries())
    .map(([channel, stats]) => ({
      channel,
      channelLabel: CHANNEL_LABELS[channel] || channel,
      color: CHANNEL_COLORS[channel] || "#94a3b8",
      ticketCount: stats.count,
      percentage:
        totalTickets > 0
          ? Math.round((stats.count / totalTickets) * 1000) / 10
          : 0,
      avgFirstResponseTime: 0,
      avgResolutionTime:
        stats.resolutionCount > 0
          ? stats.totalResolution / stats.resolutionCount
          : 0,
      csatScore: null,
    }))
    .sort((a, b) => b.ticketCount - a.ticketCount);

  return { channels, timeSeries: [], totalTickets };
}

// ============================================
// Channel Time Series
// ============================================

function dateKey(dt: string, granularity: GorgiasGranularity): string {
  const d = new Date(dt);
  switch (granularity) {
    case "hour":
      return d.toISOString().slice(0, 13) + ":00:00Z";
    case "day":
      return d.toISOString().slice(0, 10);
    case "week": {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setDate(diff);
      return monday.toISOString().slice(0, 10);
    }
    case "month":
      return d.toISOString().slice(0, 7);
  }
}

export async function fetchChannelTimeSeries(
  from: string,
  to: string,
  granularity: GorgiasGranularity = "day"
): Promise<ChannelTimeSeries[]> {
  const tickets = await fetchAllTickets(from, to);
  const dateMap = new Map<string, Record<string, number>>();

  for (const t of tickets) {
    const key = dateKey(t.created_datetime, granularity);
    const entry = dateMap.get(key) || {};
    entry[t.channel] = (entry[t.channel] || 0) + 1;
    dateMap.set(key, entry);
  }

  return Array.from(dateMap.entries())
    .map(([date, channels]) => ({ date, channels }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
