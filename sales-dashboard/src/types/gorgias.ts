// ============================================
// Gorgias API Types
// ============================================

// --- Authentication ---

export interface GorgiasCredentials {
  domain: string;     // e.g. "yourstore" (without .gorgias.com)
  email: string;      // API user email
  apiKey: string;     // API key from Gorgias Settings > REST API
}

// --- Statistics API ---

export type GorgiasStat =
  | "tickets-created"
  | "tickets-closed"
  | "tickets-open"
  | "tickets-replied"
  | "one-touch-tickets"
  | "zero-touch-tickets"
  | "satisfaction-surveys"
  | "resolution-time"
  | "first-response-time"
  | "human-first-response-time"
  | "response-time"
  | "messages-sent"
  | "messages-received"
  | "messages-per-ticket"
  | "ticket-handle-time"
  | "online-time"
  | "tags"
  | "auto-qa"
  | "automation-rate"
  | "workload-tickets"
  | "automated-interactions"
  | "ticket-sla"
  | "voice-calls"
  | "voice-calls-summary"
  | "voice-agent-events"
  | "knowledge-insights"
  | "ticket-fields";

export type GorgiasFilterOperator =
  | "one-of"
  | "not-one-of"
  | "all-of"
  | "afterDate"
  | "beforeDate"
  | "set"
  | "inDateRange"
  | "contains";

export type GorgiasFilterMember =
  | "periodStart"
  | "periodEnd"
  | "agentId"
  | "teamId"
  | "channel"
  | "integrationId"
  | "tags"
  | "storeId"
  | "status"
  | "eventType"
  | "customFields";

export interface GorgiasStatsFilter {
  member: GorgiasFilterMember | string;
  operator: GorgiasFilterOperator;
  values: string[];
}

export type GorgiasDimension =
  | "agentId"
  | "channel"
  | "integrationId"
  | "tagId"
  | "storeId"
  | "ticketId"
  | "status"
  | "customFieldValue";

export type GorgiasTimeDimensionField =
  | "createdDatetime"
  | "closedDatetime"
  | "sentDatetime"
  | "updatedDatetime"
  | "firstAgentMessageDatetime";

export type GorgiasGranularity = "hour" | "day" | "week" | "month";

export interface GorgiasTimeDimension {
  dimension: GorgiasTimeDimensionField;
  granularity: GorgiasGranularity;
}

export interface GorgiasStatsQuery {
  scope: GorgiasStat;
  filters: GorgiasStatsFilter[];
  dimensions?: GorgiasDimension[];
  measures?: string[];
  time_dimensions?: GorgiasTimeDimension[];
  timezone?: string;
}

export interface GorgiasStatsResponse<T = Record<string, unknown>> {
  object: string;
  uri: string;
  data: T[];
  meta: {
    scope: string;
    total: number;
    offset: number;
    limit: number;
    prev_cursor: string | null;
    next_cursor: string | null;
  };
}

// --- Ticket Channels ---

export type GorgiasChannel =
  | "email"
  | "chat"
  | "facebook"
  | "facebook-mention"
  | "facebook-messenger"
  | "facebook-recommendations"
  | "instagram-ad-comment"
  | "instagram-comment"
  | "instagram-dm"
  | "instagram-mention"
  | "twitter"
  | "twitter-dm"
  | "whatsapp"
  | "sms"
  | "phone"
  | "api"
  | "internal-note"
  | "yotpo-review"
  | "trustpilot";

export const CHANNEL_LABELS: Record<string, string> = {
  email: "E-mail",
  chat: "Live Chat",
  facebook: "Facebook",
  "facebook-mention": "Facebook Mention",
  "facebook-messenger": "Messenger",
  "facebook-recommendations": "Facebook Reviews",
  "instagram-ad-comment": "Instagram Ad",
  "instagram-comment": "Instagram Comment",
  "instagram-dm": "Instagram DM",
  "instagram-mention": "Instagram Mention",
  twitter: "Twitter/X",
  "twitter-dm": "Twitter/X DM",
  whatsapp: "WhatsApp",
  sms: "SMS",
  phone: "Telefoon",
  api: "API",
  "internal-note": "Interne notitie",
  "yotpo-review": "Yotpo Review",
  trustpilot: "Trustpilot",
};

export const CHANNEL_COLORS: Record<string, string> = {
  email: "#6366f1",
  chat: "#22c55e",
  facebook: "#1877f2",
  "facebook-messenger": "#0084ff",
  "instagram-dm": "#e1306c",
  "instagram-comment": "#e1306c",
  twitter: "#1da1f2",
  whatsapp: "#25d366",
  sms: "#f59e0b",
  phone: "#ef4444",
  api: "#8b5cf6",
};

// --- CS Overview aggregated types ---

export interface CSOverviewData {
  // Volume
  ticketsCreated: number;
  ticketsClosed: number;
  ticketsOpen: number;
  ticketsReplied: number;

  // Resolution
  oneTouchRate: number;        // percentage
  zeroTouchRate: number;       // percentage
  automationRate: number;      // percentage

  // Speed (in seconds)
  avgFirstResponseTime: number;
  avgHumanFirstResponseTime: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  avgHandleTime: number;

  // Quality
  csatScore: number | null;    // 1-5 scale
  csatResponseRate: number;    // percentage
  csatTotal: number;

  // SLA
  slaComplianceRate: number;   // percentage

  // Comparison with previous period
  previousPeriod: {
    ticketsCreated: number;
    ticketsClosed: number;
    avgFirstResponseTime: number;
    avgResolutionTime: number;
    csatScore: number | null;
  } | null;
}

export interface CSOverviewTimeSeries {
  date: string;
  ticketsCreated: number;
  ticketsClosed: number;
  avgFirstResponseTime: number;
  avgResolutionTime: number;
}

// --- Channel Distribution types ---

export interface ChannelStats {
  channel: string;
  channelLabel: string;
  color: string;
  ticketCount: number;
  percentage: number;
  avgFirstResponseTime: number;
  avgResolutionTime: number;
  csatScore: number | null;
}

export interface ChannelTimeSeries {
  date: string;
  channels: Record<string, number>;
}

export interface ChannelDistributionData {
  channels: ChannelStats[];
  timeSeries: ChannelTimeSeries[];
  totalTickets: number;
}
