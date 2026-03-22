// ============================================
// Database Types
// ============================================

export interface Store {
  id: string;
  name: string;
  shopify_domain: string;
  access_token: string;
  scope: string | null;
  is_active: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  name: string;
  tag: string;
  clerk_user_id: string | null;
  role: "admin" | "employee";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  store_id: string;
  shopify_order_id: number;
  order_number: string;
  tag: string;
  customer_name: string | null;
  total_paid: number;
  refund_amount: number;
  net_amount: number;
  financial_status: string;
  order_date: string;
  shopify_created_at: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  store?: Store;
}

export interface BonusConfig {
  id: string;
  name: string;
  type: "fixed" | "percentage" | "tiered";
  period: "weekly" | "monthly";
  target_amount: number | null;
  bonus_value: number | null;
  percentage_value: number | null;
  tiers: BonusTier[] | null;
  is_active: boolean;
  apply_to_all: boolean;
  created_at: string;
  updated_at: string;
}

export interface BonusTier {
  threshold: number;
  bonus: number;
}

export interface BonusAssignment {
  id: string;
  bonus_config_id: string;
  employee_id: string;
  created_at: string;
}

export interface BonusPayout {
  id: string;
  bonus_config_id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  sales_amount: number;
  bonus_amount: number;
  created_at: string;
}

// ============================================
// API Types
// ============================================

export interface DateRange {
  from: Date;
  to: Date;
}

export type PeriodFilter = "day" | "week" | "month" | "year" | "custom";

export interface DashboardFilters {
  period: PeriodFilter;
  dateRange: DateRange;
  storeId: string | "all";
  tag?: string;
}

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalRefunds: number;
  netRevenue: number;
}

export interface SalesPerEmployee {
  tag: string;
  employeeName: string;
  orderCount: number;
  totalRevenue: number;
  totalRefunds: number;
  netRevenue: number;
}

export interface TrendDataPoint {
  date: string;
  revenue: number;
  orders: number;
  refunds: number;
}

export interface LeaderboardEntry {
  rank: number;
  tag: string;
  employeeName: string;
  netRevenue: number;
  orderCount: number;
  previousNetRevenue: number;
  changePercent: number;
}

export interface BonusProgress {
  bonusConfig: BonusConfig;
  currentSales: number;
  targetAmount: number;
  progressPercent: number;
  earnedBonus: number;
  currentTier: BonusTier | null;
  nextTier: BonusTier | null;
}

// ============================================
// Shopify Types
// ============================================

export interface ShopifyOrder {
  id: string;
  name: string;
  tags: string[];
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  currentTotalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  totalRefundedSet: { shopMoney: { amount: string; currencyCode: string } };
  displayFinancialStatus: string;
  cancelledAt: string | null;
  createdAt: string;
}
