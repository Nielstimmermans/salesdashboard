"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Ticket,
  CheckCircle,
  Clock,
  Zap,
  Inbox,
  Target,
  RefreshCw,
  FileText,
} from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type {
  PeriodFilter,
  DashboardStats,
  LeaderboardEntry,
  BonusConfig,
  BonusProgress,
  Order,
} from "@/types";
import type { CSOverviewData } from "@/types/gorgias";
import type { ViewTicketCount } from "@/lib/gorgias";

// ── Helpers ──────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (seconds === 0) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return mins > 0 ? `${hours}u ${mins}m` : `${hours}u`;
}

function fmtPct(value: number): string {
  return `${Math.round(value * 10) / 10}%`;
}

const VIEW_ORDER = [
  "new one touch", "sales", "proefrit aan huis", "slechte reviews",
  "retour annuleringen", "garantie b2b", "wouter check", "chargeback", "omclosen",
];

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

function sortAndFilterViews(views: ViewTicketCount[]): ViewTicketCount[] {
  return VIEW_ORDER
    .map((ordered) => {
      const target = norm(ordered);
      return views.find((v) => {
        const name = norm(v.name);
        return name.includes(target) || target.includes(name);
      });
    })
    .filter((v): v is ViewTicketCount => v !== undefined);
}

const periods: { value: PeriodFilter; label: string }[] = [
  { value: "day", label: "Vandaag" },
  { value: "week", label: "Week" },
  { value: "month", label: "Maand" },
  { value: "year", label: "Jaar" },
];

const podiumEmoji = ["🥇", "🥈", "🥉"];

// ── Main Component ───────────────────────────────────────

export default function TVDashboardPage() {
  const [period, setPeriod] = useState<PeriodFilter>("day");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Data states
  const [sales, setSales] = useState<DashboardStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [csData, setCsData] = useState<CSOverviewData | null>(null);
  const [viewCounts, setViewCounts] = useState<ViewTicketCount[]>([]);
  const [teamBonuses, setTeamBonuses] = useState<BonusProgress[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const params = new URLSearchParams({ period, storeId: "all" });

    try {
      const [salesRes, lbRes, csRes, viewsRes, bonusRes, ordersRes] = await Promise.allSettled([
        fetch(`/api/stats?${params}`),
        fetch(`/api/leaderboard?${params}`),
        fetch(`/api/cs/overview?${new URLSearchParams({ period, time_series: "false" })}`),
        fetch("/api/cs/views"),
        fetch("/api/bonuses"),
        fetch(`/api/orders?${params}&limit=10`),
      ]);

      let teamSalesTotal = 0;
      if (salesRes.status === "fulfilled" && salesRes.value.ok) {
        const d = await salesRes.value.json();
        setSales(d.stats);
        teamSalesTotal = d.stats?.netRevenue || 0;
      }
      if (lbRes.status === "fulfilled" && lbRes.value.ok) {
        const d = await lbRes.value.json();
        setLeaderboard(d.entries || []);
      }
      if (csRes.status === "fulfilled" && csRes.value.ok) {
        const d = await csRes.value.json();
        setCsData(d.overview);
      }
      if (viewsRes.status === "fulfilled" && viewsRes.value.ok) {
        const d = await viewsRes.value.json();
        setViewCounts(d.viewCounts || []);
      }
      if (ordersRes.status === "fulfilled" && ordersRes.value.ok) {
        const d = await ordersRes.value.json();
        setOrders(d.orders || []);
      }
      if (bonusRes.status === "fulfilled" && bonusRes.value.ok) {
        const d = await bonusRes.value.json();
        // Filter team bonuses that are active
        const configs: BonusConfig[] = (d.configs || []).filter(
          (c: BonusConfig) => c.is_active && c.scope === "group"
        );
        // Build progress for team bonuses
        if (configs.length > 0) {
          const teamSales = teamSalesTotal;
          const progress: BonusProgress[] = configs.map((config) => {
            const target = config.target_amount || 0;
            const progressPct = target > 0 ? (teamSales / target) * 100 : 0;
            let earned = 0;
            if (config.type === "tiered" && config.tiers) {
              const sorted = [...config.tiers].sort((a, b) => b.threshold - a.threshold);
              const hit = sorted.find((t) => teamSales >= t.threshold);
              earned = hit ? hit.bonus : 0;
            } else if (config.type === "fixed" && teamSales >= target) {
              earned = config.bonus_value || 0;
            } else if (config.type === "percentage" && teamSales >= target) {
              earned = ((config.percentage_value || 0) / 100) * (teamSales - target);
            }
            const nextTier = config.tiers
              ? [...config.tiers].sort((a, b) => a.threshold - b.threshold).find((t) => teamSales < t.threshold)
              : null;
            return {
              bonusConfig: config,
              currentSales: teamSales,
              targetAmount: target,
              progressPercent: progressPct,
              earnedBonus: earned,
              currentTier: null,
              nextTier: nextTier || null,
              isGroup: true,
            };
          });
          setTeamBonuses(progress);
        }
      }

      setLastRefresh(new Date());
    } catch (err) {
      console.error("TV fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  // Initial fetch + auto-refresh every 60s
  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 60_000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const filteredViews = sortAndFilterViews(viewCounts);
  const totalOpen = viewCounts.length > 0
    ? viewCounts.reduce((sum, v) => sum + v.count, 0)
    : 0;

  return (
    <div className="flex h-screen flex-col gap-2 px-10 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Sales Dashboard</h1>
          <div className="flex rounded-lg border border-gray-700 bg-gray-900 p-0.5">
            {periods.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  period === p.value
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <RefreshCw className="h-3 w-3" />
          {lastRefresh.toLocaleTimeString("nl-NL")}
        </div>
      </div>

      {/* Sales KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { title: "Netto Omzet", value: sales ? formatCurrency(sales.netRevenue) : "—", icon: DollarSign, color: "text-green-400" },
          { title: "Aantal Orders", value: sales ? formatNumber(sales.totalOrders) : "—", icon: ShoppingCart, color: "text-blue-400" },
          { title: "Gem. Orderwaarde", value: sales ? formatCurrency(sales.averageOrderValue) : "—", icon: TrendingUp, color: "text-purple-400" },
          { title: "Refunds", value: sales ? formatCurrency(sales.totalRefunds) : "—", icon: RotateCcw, color: "text-red-400" },
        ].map((card) => (
          <div key={card.title} className="rounded-lg border border-gray-800 bg-gray-900 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-400">{card.title}</p>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <p className="mt-1 text-xl font-bold">{loading ? "..." : card.value}</p>
          </div>
        ))}
      </div>

      {/* Main content: Leaderboard + CS + Bonuses */}
      <div className="grid flex-1 grid-cols-12 gap-3 overflow-hidden">
        {/* Leaderboard + Orders — 5 cols */}
        <div className="col-span-5 flex flex-col gap-2 overflow-hidden">
          {/* Leaderboard */}
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-3">
            <h3 className="mb-1.5 text-sm font-semibold text-gray-300">Leaderboard</h3>
            {leaderboard.length === 0 && !loading ? (
              <p className="text-center text-sm text-gray-600">Geen data</p>
            ) : (
              <div className="space-y-1">
                {leaderboard.slice(0, 5).map((entry, idx) => (
                  <div
                    key={entry.tag}
                    className={`flex items-center justify-between rounded-md px-3 py-1 ${
                      idx < 3 ? "bg-gray-800" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 text-center text-sm">
                        {idx < 3 ? podiumEmoji[idx] : `#${entry.rank}`}
                      </span>
                      <span className="text-sm font-medium">{entry.employeeName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">{entry.orderCount} orders</span>
                      <span className="text-sm font-bold text-green-400">
                        {formatCurrency(entry.netRevenue)}
                      </span>
                      {entry.changePercent !== 0 && (
                        <span className={`flex items-center text-xs ${entry.changePercent > 0 ? "text-green-500" : "text-red-500"}`}>
                          {entry.changePercent > 0 ? <TrendingUp className="mr-0.5 h-3 w-3" /> : <TrendingDown className="mr-0.5 h-3 w-3" />}
                          {Math.abs(Math.round(entry.changePercent))}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Orders */}
          <div className="flex-1 overflow-hidden rounded-lg border border-gray-800 bg-gray-900 p-3">
            <div className="mb-1.5 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-300">Recente orders</h3>
            </div>
            {orders.length === 0 && !loading ? (
              <p className="text-center text-sm text-gray-600">Geen orders</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500">
                    <th className="pb-1 text-left font-medium">Order</th>
                    <th className="pb-1 text-left font-medium">Medewerker</th>
                    <th className="pb-1 text-right font-medium">Bedrag</th>
                    <th className="pb-1 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 8).map((order) => (
                    <tr key={order.id} className="border-t border-gray-800">
                      <td className="py-1 text-gray-300">#{order.order_number}</td>
                      <td className="py-1">
                        <span className="rounded bg-blue-900/50 px-1.5 py-0.5 text-blue-300">
                          {order.tag || "—"}
                        </span>
                      </td>
                      <td className="py-1 text-right font-medium text-green-400">
                        {formatCurrency(order.total_paid)}
                      </td>
                      <td className="py-1 text-right">
                        <span className={`rounded px-1.5 py-0.5 ${
                          order.financial_status === "paid"
                            ? "bg-green-900/50 text-green-300"
                            : order.financial_status === "refunded"
                            ? "bg-red-900/50 text-red-300"
                            : "bg-gray-800 text-gray-400"
                        }`}>
                          {order.financial_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* CS Overview — 4 cols */}
        <div className="col-span-4 flex flex-col gap-3 overflow-hidden">
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-3">
            <h3 className="mb-2 text-sm font-semibold text-gray-300">Customer Service</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Aangemaakt", value: csData?.ticketsCreated ?? 0, sub: `${totalOpen} open`, icon: Ticket, color: "text-indigo-400" },
                { label: "Gesloten", value: csData?.ticketsClosed ?? 0, sub: `${csData?.ticketsReplied ?? 0} beantwoord`, icon: CheckCircle, color: "text-green-400" },
                { label: "Eerste responstijd", value: formatDuration(csData?.avgFirstResponseTime ?? 0), icon: Clock, color: "text-orange-400" },
                { label: "Oplostijd", value: formatDuration(csData?.avgResolutionTime ?? 0), icon: Zap, color: "text-yellow-400" },
              ].map((item) => (
                <div key={item.label} className="rounded-md bg-gray-800 p-2">
                  <div className="flex items-center gap-1.5">
                    <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                    <span className="text-[11px] text-gray-400">{item.label}</span>
                  </div>
                  <p className="mt-0.5 text-lg font-bold">
                    {typeof item.value === "number" ? item.value.toLocaleString("nl-NL") : item.value}
                  </p>
                  {"sub" in item && item.sub && (
                    <p className="text-[10px] text-gray-500">{item.sub}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Views */}
          <div className="flex-1 rounded-lg border border-gray-800 bg-gray-900 p-3 overflow-hidden">
            <h3 className="mb-2 text-sm font-semibold text-gray-300">Openstaande tickets</h3>
            <div className="grid grid-cols-3 gap-1.5">
              {filteredViews.map((view) => (
                <div key={view.id} className="flex items-center gap-2 rounded-md bg-gray-800 px-2 py-1.5">
                  <Inbox className="h-3 w-3 text-indigo-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-[10px] text-gray-400">{view.name}</p>
                    <p className="text-sm font-bold">{view.count}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Team Bonuses — 3 cols */}
        <div className="col-span-3 flex flex-col gap-3 overflow-hidden">
          <div className="flex-1 rounded-lg border border-gray-800 bg-gray-900 p-3">
            <h3 className="mb-2 text-sm font-semibold text-gray-300">Team Bonussen</h3>
            {teamBonuses.length === 0 && !loading ? (
              <p className="text-center text-sm text-gray-600">Geen team bonussen</p>
            ) : (
              <div className="space-y-3">
                {teamBonuses.map((item) => (
                  <div key={item.bonusConfig.id} className="rounded-md bg-gray-800 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5 text-blue-400" />
                        <span className="text-sm font-medium">{item.bonusConfig.name}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {item.bonusConfig.period === "weekly" ? "Week" : item.bonusConfig.period === "monthly" ? "Maand" : "All-time"}
                      </span>
                    </div>
                    {/* Progress */}
                    <div className="mt-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">
                          {formatCurrency(item.currentSales)} / {formatCurrency(item.targetAmount)}
                        </span>
                        <span className="font-medium text-blue-400">{fmtPct(item.progressPercent)}</span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-700">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all duration-500"
                          style={{ width: `${Math.min(100, item.progressPercent)}%` }}
                        />
                      </div>
                    </div>
                    {/* Reward */}
                    <div className="mt-2 text-xs">
                      <span className="text-gray-500">Beloning: </span>
                      <span className="font-semibold text-green-400">
                        {item.bonusConfig.reward_label
                          ? item.progressPercent >= 100
                            ? item.bonusConfig.reward_label
                            : `${item.bonusConfig.reward_label} (nog niet bereikt)`
                          : formatCurrency(item.earnedBonus)}
                      </span>
                    </div>
                    {/* Next tier */}
                    {item.nextTier && (
                      <p className="mt-1 text-[10px] text-gray-500">
                        Nog {formatCurrency(item.nextTier.threshold - item.currentSales)} voor volgende staffel
                        {item.nextTier.reward_label ? ` (${item.nextTier.reward_label})` : ` (${formatCurrency(item.nextTier.bonus)})`}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
