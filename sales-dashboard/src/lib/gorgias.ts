import type {
  GorgiasStatsQuery,
  GorgiasStatsResponse,
  GorgiasStatsFilter,
  GorgiasStat,
  GorgiasDimension,
  GorgiasGranularity,
  CSOverviewData,
  CSOverviewTimeSeries,
  ChannelDistributionData,
  ChannelStats,
  ChannelTimeSeries,
  CHANNEL_LABELS,
  CHANNEL_COLORS,
} from "@/types/gorgias";
import { supabaseAdmin } from "@/lib/supabase";

// ============================================
// Gorgias API Client
// ============================================

interface GorgiasStore {
  id: string;
  gorgias_domain: string;
  gorgias_email: string;
  gorgias_api_key: string;
}

/**
 * Base function to call the Gorgias REST API.
 * Uses Basic Auth: base64(email:apiKey)
 */
async function gorgiasRequest<T>(
  store: GorgiasStore,
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown
): Promise<T> {
  const baseUrl = `https://${store.gorgias_domain}.gorgias.com`;
  const auth = Buffer.from(
    `${store.gorgias_email}:${store.gorgias_api_key}`
  ).toString("base64");

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(
      `Gorgias API error ${res.status} for ${store.gorgias_domain}: ${errorBody}`
    );
  }

  return res.json() as Promise<T>;
}

// ============================================
// Statistics API helpers
// ============================================

/**
 * Build the date filters used in almost every stats query.
 */
function buildDateFilters(from: string, to: string): GorgiasStatsFilter[] {
  return [
    { member: "periodStart", operator: "afterDate", values: [from] },
    { member: "periodEnd", operator: "beforeDate", values: [to] },
  ];
}

/**
 * Fetch a single statistic from the Gorgias Stats API.
 */
async function fetchStat<T = Record<string, unknown>>(
  store: GorgiasStore,
  query: GorgiasStatsQuery
): Promise<GorgiasStatsResponse<T>> {
  return gorgiasRequest<GorgiasStatsResponse<T>>(
    store,
    "POST",
    `/api/stats/${query.scope}`,
    {
      scope: query.scope,
      filters: query.filters,
      dimensions: query.dimensions || [],
      measures: query.measures || [],
      time_dimensions: query.time_dimensions || [],
      timezone: query.timezone || "Europe/Amsterdam",
    }
  );
}

/**
 * Fetch a stat that returns a single aggregate number.
 * Returns the first row's first measure value, or 0.
 */
async function fetchSingleStat(
  store: GorgiasStore,
  scope: GorgiasStat,
  measures: string[],
  from: string,
  to: string
): Promise<Record<string, number>> {
  const response = await fetchStat(store, {
    scope,
    filters: buildDateFilters(from, to),
    measures,
  });

  if (response.data.length === 0) {
    return Object.fromEntries(measures.map((m) => [m, 0]));
  }

  const row = response.data[0] as Record<string, unknown>;
  return Object.fromEntries(
    measures.map((m) => [m, typeof row[m] === "number" ? row[m] : 0])
  );
}

/**
 * Fetch a stat broken down by time (for charts).
 */
async function fetchTimeSeries<T = Record<string, unknown>>(
  store: GorgiasStore,
  scope: GorgiasStat,
  measures: string[],
  from: string,
  to: string,
  granularity: GorgiasGranularity = "day",
  dimensions?: GorgiasDimension[]
): Promise<T[]> {
  const response = await fetchStat<T>(store, {
    scope,
    filters: buildDateFilters(from, to),
    measures,
    dimensions,
    time_dimensions: [
      { dimension: "createdDatetime", granularity },
    ],
  });

  return response.data;
}

/**
 * Fetch a stat broken down by a single dimension.
 */
async function fetchByDimension<T = Record<string, unknown>>(
  store: GorgiasStore,
  scope: GorgiasStat,
  measures: string[],
  dimension: GorgiasDimension,
  from: string,
  to: string
): Promise<T[]> {
  const response = await fetchStat<T>(store, {
    scope,
    filters: buildDateFilters(from, to),
    measures,
    dimensions: [dimension],
  });

  return response.data;
}

// ============================================
// Get all active Gorgias stores from Supabase
// ============================================

async function getGorgiasStores(
  storeId?: string
): Promise<GorgiasStore[]> {
  let query = supabaseAdmin
    .from("stores")
    .select("id, gorgias_domain, gorgias_email, gorgias_api_key")
    .eq("is_active", true)
    .not("gorgias_domain", "is", null);

  if (storeId && storeId !== "all") {
    query = query.eq("id", storeId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch stores: ${error.message}`);
  return (data || []) as GorgiasStore[];
}

// ============================================
// CS Overview — Aggregate all KPIs
// ============================================

export async function fetchCSOverview(
  from: string,
  to: string,
  storeId?: string
): Promise<CSOverviewData> {
  const stores = await getGorgiasStores(storeId);

  if (stores.length === 0) {
    throw new Error("No Gorgias stores configured");
  }

  // Aggregate across all stores
  const aggregated: CSOverviewData = {
    ticketsCreated: 0,
    ticketsClosed: 0,
    ticketsOpen: 0,
    ticketsReplied: 0,
    oneTouchRate: 0,
    zeroTouchRate: 0,
    automationRate: 0,
    avgFirstResponseTime: 0,
    avgHumanFirstResponseTime: 0,
    avgResponseTime: 0,
    avgResolutionTime: 0,
    avgHandleTime: 0,
    csatScore: null,
    csatResponseRate: 0,
    csatTotal: 0,
    slaComplianceRate: 0,
    previousPeriod: null,
  };

  // Weighted averages need total counts
  let totalForAvg = 0;
  let csatWeightedSum = 0;
  let csatTotalResponses = 0;

  for (const store of stores) {
    // Fetch all stats in parallel per store
    const [
      created,
      closed,
      open,
      replied,
      oneTouch,
      zeroTouch,
      automation,
      firstResponse,
      humanFirstResponse,
      responseTime,
      resolution,
      handleTime,
      csat,
      sla,
    ] = await Promise.all([
      fetchSingleStat(store, "tickets-created", ["ticketCount"], from, to),
      fetchSingleStat(store, "tickets-closed", ["ticketCount"], from, to),
      fetchSingleStat(store, "tickets-open", ["ticketCount"], from, to),
      fetchSingleStat(store, "tickets-replied", ["ticketCount"], from, to),
      fetchSingleStat(store, "one-touch-tickets", ["ticketCount", "oneTouchRate"], from, to),
      fetchSingleStat(store, "zero-touch-tickets", ["ticketCount", "zeroTouchRate"], from, to),
      fetchSingleStat(store, "automation-rate", ["automationRate"], from, to),
      fetchSingleStat(store, "first-response-time", ["medianFirstResponseTime", "averageFirstResponseTime"], from, to),
      fetchSingleStat(store, "human-first-response-time", ["averageFirstResponseTime"], from, to),
      fetchSingleStat(store, "response-time", ["averageResponseTime"], from, to),
      fetchSingleStat(store, "resolution-time", ["medianResolutionTime", "averageResolutionTime"], from, to),
      fetchSingleStat(store, "ticket-handle-time", ["averageHandleTime"], from, to),
      fetchSingleStat(store, "satisfaction-surveys", ["averageSurveyScore", "surveyResponseRate", "surveyCount"], from, to),
      fetchSingleStat(store, "ticket-sla", ["slaComplianceRate"], from, to),
    ]);

    const storeTickets = created.ticketCount || 0;
    const weight = storeTickets;

    aggregated.ticketsCreated += storeTickets;
    aggregated.ticketsClosed += closed.ticketCount || 0;
    aggregated.ticketsOpen += open.ticketCount || 0;
    aggregated.ticketsReplied += replied.ticketCount || 0;

    // Weighted averages
    aggregated.avgFirstResponseTime += (firstResponse.averageFirstResponseTime || 0) * weight;
    aggregated.avgHumanFirstResponseTime += (humanFirstResponse.averageFirstResponseTime || 0) * weight;
    aggregated.avgResponseTime += (responseTime.averageResponseTime || 0) * weight;
    aggregated.avgResolutionTime += (resolution.averageResolutionTime || 0) * weight;
    aggregated.avgHandleTime += (handleTime.averageHandleTime || 0) * weight;
    aggregated.automationRate += (automation.automationRate || 0) * weight;
    aggregated.oneTouchRate += (oneTouch.oneTouchRate || 0) * weight;
    aggregated.zeroTouchRate += (zeroTouch.zeroTouchRate || 0) * weight;
    aggregated.slaComplianceRate += (sla.slaComplianceRate || 0) * weight;

    totalForAvg += weight;

    // CSAT
    const surveysReceived = csat.surveyCount || 0;
    if (surveysReceived > 0 && csat.averageSurveyScore) {
      csatWeightedSum += csat.averageSurveyScore * surveysReceived;
      csatTotalResponses += surveysReceived;
    }
    aggregated.csatTotal += surveysReceived;
    aggregated.csatResponseRate += (csat.surveyResponseRate || 0) * weight;
  }

  // Calculate weighted averages
  if (totalForAvg > 0) {
    aggregated.avgFirstResponseTime /= totalForAvg;
    aggregated.avgHumanFirstResponseTime /= totalForAvg;
    aggregated.avgResponseTime /= totalForAvg;
    aggregated.avgResolutionTime /= totalForAvg;
    aggregated.avgHandleTime /= totalForAvg;
    aggregated.automationRate /= totalForAvg;
    aggregated.oneTouchRate /= totalForAvg;
    aggregated.zeroTouchRate /= totalForAvg;
    aggregated.slaComplianceRate /= totalForAvg;
    aggregated.csatResponseRate /= totalForAvg;
  }

  if (csatTotalResponses > 0) {
    aggregated.csatScore = csatWeightedSum / csatTotalResponses;
  }

  return aggregated;
}

// ============================================
// CS Overview — Time Series for charts
// ============================================

export async function fetchCSOverviewTimeSeries(
  from: string,
  to: string,
  granularity: GorgiasGranularity = "day",
  storeId?: string
): Promise<CSOverviewTimeSeries[]> {
  const stores = await getGorgiasStores(storeId);
  const dateMap = new Map<string, CSOverviewTimeSeries>();

  for (const store of stores) {
    const [createdSeries, closedSeries] = await Promise.all([
      fetchTimeSeries<{ createdDatetime: string; ticketCount: number }>(
        store,
        "tickets-created",
        ["ticketCount"],
        from,
        to,
        granularity
      ),
      fetchTimeSeries<{ createdDatetime: string; ticketCount: number }>(
        store,
        "tickets-closed",
        ["ticketCount"],
        from,
        to,
        granularity
      ),
    ]);

    for (const row of createdSeries) {
      const date = row.createdDatetime;
      const existing = dateMap.get(date) || {
        date,
        ticketsCreated: 0,
        ticketsClosed: 0,
        avgFirstResponseTime: 0,
        avgResolutionTime: 0,
      };
      existing.ticketsCreated += row.ticketCount || 0;
      dateMap.set(date, existing);
    }

    for (const row of closedSeries) {
      const date = row.createdDatetime;
      const existing = dateMap.get(date) || {
        date,
        ticketsCreated: 0,
        ticketsClosed: 0,
        avgFirstResponseTime: 0,
        avgResolutionTime: 0,
      };
      existing.ticketsClosed += row.ticketCount || 0;
      dateMap.set(date, existing);
    }
  }

  return Array.from(dateMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

// ============================================
// Channel Distribution
// ============================================

export async function fetchChannelDistribution(
  from: string,
  to: string,
  storeId?: string
): Promise<ChannelDistributionData> {
  const stores = await getGorgiasStores(storeId);

  // Aggregate channel counts across stores
  const channelMap = new Map<
    string,
    {
      ticketCount: number;
      totalFirstResponse: number;
      totalResolution: number;
      countForAvg: number;
      csatSum: number;
      csatCount: number;
    }
  >();

  let totalTickets = 0;

  for (const store of stores) {
    // Tickets by channel
    const channelBreakdown = await fetchByDimension<{
      channel: string;
      ticketCount: number;
    }>(store, "tickets-created", ["ticketCount"], "channel", from, to);

    // First response time by channel
    const frtByChannel = await fetchByDimension<{
      channel: string;
      averageFirstResponseTime: number;
    }>(
      store,
      "first-response-time",
      ["averageFirstResponseTime"],
      "channel",
      from,
      to
    );

    // Resolution time by channel
    const resByChannel = await fetchByDimension<{
      channel: string;
      averageResolutionTime: number;
    }>(
      store,
      "resolution-time",
      ["averageResolutionTime"],
      "channel",
      from,
      to
    );

    // CSAT by channel
    const csatByChannel = await fetchByDimension<{
      channel: string;
      averageSurveyScore: number;
      surveyCount: number;
    }>(
      store,
      "satisfaction-surveys",
      ["averageSurveyScore", "surveyCount"],
      "channel",
      from,
      to
    );

    // Build lookup maps for this store
    const frtMap = new Map(frtByChannel.map((r) => [r.channel, r]));
    const resMap = new Map(resByChannel.map((r) => [r.channel, r]));
    const csatMap = new Map(csatByChannel.map((r) => [r.channel, r]));

    for (const row of channelBreakdown) {
      const ch = row.channel;
      const count = row.ticketCount || 0;
      totalTickets += count;

      const existing = channelMap.get(ch) || {
        ticketCount: 0,
        totalFirstResponse: 0,
        totalResolution: 0,
        countForAvg: 0,
        csatSum: 0,
        csatCount: 0,
      };

      existing.ticketCount += count;

      const frt = frtMap.get(ch);
      if (frt) {
        existing.totalFirstResponse +=
          (frt.averageFirstResponseTime || 0) * count;
        existing.countForAvg += count;
      }

      const res = resMap.get(ch);
      if (res) {
        existing.totalResolution +=
          (res.averageResolutionTime || 0) * count;
      }

      const csat = csatMap.get(ch);
      if (csat && csat.surveyCount > 0) {
        existing.csatSum += csat.averageSurveyScore * csat.surveyCount;
        existing.csatCount += csat.surveyCount;
      }

      channelMap.set(ch, existing);
    }
  }

  // Build sorted channel stats
  const channels: ChannelStats[] = Array.from(channelMap.entries())
    .map(([channel, stats]) => ({
      channel,
      channelLabel:
        (CHANNEL_LABELS as Record<string, string>)[channel] || channel,
      color:
        (CHANNEL_COLORS as Record<string, string>)[channel] || "#94a3b8",
      ticketCount: stats.ticketCount,
      percentage:
        totalTickets > 0
          ? Math.round((stats.ticketCount / totalTickets) * 1000) / 10
          : 0,
      avgFirstResponseTime:
        stats.countForAvg > 0
          ? stats.totalFirstResponse / stats.countForAvg
          : 0,
      avgResolutionTime:
        stats.countForAvg > 0
          ? stats.totalResolution / stats.countForAvg
          : 0,
      csatScore:
        stats.csatCount > 0 ? stats.csatSum / stats.csatCount : null,
    }))
    .sort((a, b) => b.ticketCount - a.ticketCount);

  return { channels, timeSeries: [], totalTickets };
}

// ============================================
// Channel Distribution — Time Series
// ============================================

export async function fetchChannelTimeSeries(
  from: string,
  to: string,
  granularity: GorgiasGranularity = "day",
  storeId?: string
): Promise<ChannelTimeSeries[]> {
  const stores = await getGorgiasStores(storeId);
  const dateMap = new Map<string, Record<string, number>>();

  for (const store of stores) {
    const data = await fetchTimeSeries<{
      createdDatetime: string;
      channel: string;
      ticketCount: number;
    }>(
      store,
      "tickets-created",
      ["ticketCount"],
      from,
      to,
      granularity,
      ["channel"]
    );

    for (const row of data) {
      const date = row.createdDatetime;
      const existing = dateMap.get(date) || {};
      existing[row.channel] =
        (existing[row.channel] || 0) + (row.ticketCount || 0);
      dateMap.set(date, existing);
    }
  }

  return Array.from(dateMap.entries())
    .map(([date, channels]) => ({ date, channels }))
    .sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
}
