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

interface GorgiasMessage {
  id: number;
  from_agent: boolean;
  created_datetime: string;
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

/**
 * Fetch tickets that were CLOSED within a date range (regardless of when they were created).
 * Uses updated_datetime ordering to find recently closed tickets, filters client-side.
 */
async function fetchTicketsClosedInPeriod(from: string, to: string): Promise<GorgiasTicket[]> {
  return dedupedFetch(`closed:${from}:${to}`, async () => {
    const { baseUrl, headers } = getGorgiasAuth();
    const all: GorgiasTicket[] = [];
    let cursor: string | null = null;

    const fromDate = new Date(from);
    const toDate = new Date(to);

    const MAX_PAGES = 10; // Limit scan depth to prevent excessive API calls
    let page = 0;

    while (page < MAX_PAGES) {
      const url = new URL(`${baseUrl}/api/tickets`);
      url.searchParams.set("limit", "100");
      url.searchParams.set("order_by", "updated_datetime:desc");
      if (cursor) url.searchParams.set("cursor", cursor);

      const res = await fetchWithRetry(url.toString(), { headers });
      if (!res.ok) {
        throw new Error(`Gorgias API error ${res.status}: ${await res.text()}`);
      }

      const data: GorgiasListResponse<GorgiasTicket> = await res.json();
      let foundOlder = false;

      for (const ticket of data.data) {
        if (ticket.status !== "closed" || !ticket.closed_datetime) continue;
        const closed = new Date(ticket.closed_datetime);
        if (closed < fromDate) {
          foundOlder = true;
          break;
        }
        if (closed <= toDate) all.push(ticket);
      }

      if (foundOlder || !data.meta.next_cursor || data.data.length === 0) break;
      cursor = data.meta.next_cursor;
      page++;
      await new Promise((r) => setTimeout(r, 500));
    }

    return all;
  });
}

/**
 * Fetch first response time for a sample of tickets.
 * Limited to 15 tickets in batches of 3 to stay within rate limits.
 */
async function fetchFirstResponseTimes(
  closedTickets: GorgiasTicket[],
  maxTickets = 15
): Promise<number[]> {
  const { baseUrl, headers } = getGorgiasAuth();
  const sample = closedTickets.slice(0, maxTickets);
  const times: number[] = [];

  for (let i = 0; i < sample.length; i += 3) {
    const batch = sample.slice(i, i + 3);
    const results = await Promise.all(
      batch.map(async (ticket) => {
        try {
          const url = new URL(`${baseUrl}/api/tickets/${ticket.id}/messages`);
          url.searchParams.set("limit", "5");
          url.searchParams.set("order_by", "created_datetime:asc");

          const res = await fetchWithRetry(url.toString(), { headers });
          if (!res.ok) return null;

          const data: GorgiasListResponse<GorgiasMessage> = await res.json();
          const firstAgent = data.data.find((m) => m.from_agent);
          if (!firstAgent) return null;

          const diff =
            (new Date(firstAgent.created_datetime).getTime() -
              new Date(ticket.created_datetime).getTime()) /
            1000;
          return diff > 0 ? diff : null;
        } catch {
          return null;
        }
      })
    );

    for (const r of results) {
      if (r !== null) times.push(r);
    }

    if (i + 3 < sample.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return times;
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
// CS Overview — Compute KPIs from tickets
// ============================================

export async function fetchCSOverview(
  from: string,
  to: string
): Promise<CSOverviewData> {
  return dedupedFetch(`overview:${from}:${to}`, async () => {
  // Fetch in parallel: tickets created in period + tickets closed in period
  const [createdTickets, closedTickets] = await Promise.all([
    fetchAllTickets(from, to),
    fetchTicketsClosedInPeriod(from, to),
  ]);

  const created = createdTickets.length;
  const closed = closedTickets.length;
  const open = createdTickets.filter((t) => t.status === "open").length;
  const replied = createdTickets.filter((t) => t.messages_count > 1).length;

  // One-touch: closed with <= 2 messages (1 customer + 1 agent)
  const oneTouch = closedTickets.filter((t) => t.messages_count <= 2).length;
  const oneTouchRate = closed > 0 ? (oneTouch / closed) * 100 : 0;

  // Resolution time (from tickets closed in period)
  let totalResolutionTime = 0;
  let resolutionCount = 0;
  for (const t of closedTickets) {
    if (t.closed_datetime) {
      const diff =
        (new Date(t.closed_datetime).getTime() -
          new Date(t.created_datetime).getTime()) /
        1000;
      if (diff > 0) {
        totalResolutionTime += diff;
        resolutionCount++;
      }
    }
  }
  const avgResolutionTime =
    resolutionCount > 0 ? totalResolutionTime / resolutionCount : 0;

  // First response time — sample from tickets closed in period
  const frtSamples = await fetchFirstResponseTimes(closedTickets);
  const avgFirstResponseTime =
    frtSamples.length > 0
      ? frtSamples.reduce((a, b) => a + b, 0) / frtSamples.length
      : 0;

  return {
    ticketsCreated: created,
    ticketsClosed: closed,
    ticketsOpen: open,
    ticketsReplied: replied,
    oneTouchRate,
    zeroTouchRate: 0,
    automationRate: 0,
    avgFirstResponseTime,
    avgHumanFirstResponseTime: avgFirstResponseTime,
    avgResponseTime: 0,
    avgResolutionTime,
    avgHandleTime: 0,
    csatScore: null,
    csatResponseRate: 0,
    csatTotal: 0,
    slaComplianceRate: 0,
    previousPeriod: null,
  };
  });
}

// ============================================
// CS Overview — Time Series
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

export async function fetchCSOverviewTimeSeries(
  from: string,
  to: string,
  granularity: GorgiasGranularity = "day"
): Promise<CSOverviewTimeSeries[]> {
  const tickets = await fetchAllTickets(from, to);
  const map = new Map<string, { created: number; closed: number }>();

  for (const t of tickets) {
    const key = dateKey(t.created_datetime, granularity);
    const entry = map.get(key) || { created: 0, closed: 0 };
    entry.created++;
    map.set(key, entry);

    if (t.status === "closed" && t.closed_datetime) {
      const closedKey = dateKey(t.closed_datetime, granularity);
      const closedEntry = map.get(closedKey) || { created: 0, closed: 0 };
      closedEntry.closed++;
      map.set(closedKey, closedEntry);
    }
  }

  return Array.from(map.entries())
    .map(([date, counts]) => ({
      date,
      ticketsCreated: counts.created,
      ticketsClosed: counts.closed,
      avgFirstResponseTime: 0,
      avgResolutionTime: 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
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
