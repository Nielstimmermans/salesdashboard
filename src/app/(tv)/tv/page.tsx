"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Star,
  Volume2,
  VolumeX,
  Megaphone,
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

// ── Sale Popup Component ─────────────────────────────────

interface SalePopupData {
  amount: number;
  tag: string;
  orderNumber: string;
}

function SalePopup({ sale, onDone }: { sale: SalePopupData; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 30000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onDone}
      style={{ cursor: "pointer" }}
    >
      {/* Background overlay with radial glow */}
      <div className="absolute inset-0 sale-popup-bg" />

      {/* Rays */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
        <div className="sale-rays" />
      </div>

      {/* Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="sale-particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
              backgroundColor: ["#FFD700", "#FF6B35", "#00E676", "#FF4081", "#40C4FF", "#FFEB3B"][i % 6],
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center sale-popup-content">
        {/* Diamond shape behind text */}
        <div className="sale-diamond" />

        {/* SALE text */}
        <div className="sale-title">
          💰 SALE!
        </div>

        {/* Amount */}
        <div className="sale-amount">
          {formatCurrency(sale.amount)}
        </div>

        {/* Tag / Employee */}
        <div className="sale-tag">
          {sale.tag}
        </div>

        {/* Order number */}
        <div className="mt-2 text-sm text-gray-400 sale-fade-in">
          #{sale.orderNumber}
        </div>
      </div>

      <style jsx>{`
        .sale-popup-bg {
          background: radial-gradient(ellipse at center, rgba(255, 180, 0, 0.3) 0%, rgba(0, 0, 0, 0.95) 70%);
          animation: bgPulse 2s ease-in-out infinite;
        }

        @keyframes bgPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }

        .sale-rays {
          width: 200vmax;
          height: 200vmax;
          background: conic-gradient(
            from 0deg,
            transparent 0deg, rgba(255, 200, 0, 0.08) 5deg, transparent 10deg,
            transparent 20deg, rgba(255, 200, 0, 0.08) 25deg, transparent 30deg,
            transparent 40deg, rgba(255, 200, 0, 0.08) 45deg, transparent 50deg,
            transparent 60deg, rgba(255, 200, 0, 0.08) 65deg, transparent 70deg,
            transparent 80deg, rgba(255, 200, 0, 0.08) 85deg, transparent 90deg,
            transparent 100deg, rgba(255, 200, 0, 0.08) 105deg, transparent 110deg,
            transparent 120deg, rgba(255, 200, 0, 0.08) 125deg, transparent 130deg,
            transparent 140deg, rgba(255, 200, 0, 0.08) 145deg, transparent 150deg,
            transparent 160deg, rgba(255, 200, 0, 0.08) 165deg, transparent 170deg,
            transparent 180deg, rgba(255, 200, 0, 0.08) 185deg, transparent 190deg,
            transparent 200deg, rgba(255, 200, 0, 0.08) 205deg, transparent 210deg,
            transparent 220deg, rgba(255, 200, 0, 0.08) 225deg, transparent 230deg,
            transparent 240deg, rgba(255, 200, 0, 0.08) 245deg, transparent 250deg,
            transparent 260deg, rgba(255, 200, 0, 0.08) 265deg, transparent 270deg,
            transparent 280deg, rgba(255, 200, 0, 0.08) 285deg, transparent 290deg,
            transparent 300deg, rgba(255, 200, 0, 0.08) 305deg, transparent 310deg,
            transparent 320deg, rgba(255, 200, 0, 0.08) 325deg, transparent 330deg,
            transparent 340deg, rgba(255, 200, 0, 0.08) 345deg, transparent 350deg
          );
          animation: raysSpin 20s linear infinite;
        }

        @keyframes raysSpin {
          to { transform: rotate(360deg); }
        }

        .sale-popup-content {
          animation: contentEntry 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        @keyframes contentEntry {
          0% { transform: scale(0.3); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }

        .sale-diamond {
          position: absolute;
          width: 350px;
          height: 350px;
          background: linear-gradient(135deg, rgba(255, 180, 0, 0.15), rgba(255, 80, 0, 0.1));
          border: 2px solid rgba(255, 200, 0, 0.3);
          transform: rotate(45deg);
          top: -60px;
          border-radius: 24px;
          animation: diamondPulse 2s ease-in-out infinite;
        }

        @keyframes diamondPulse {
          0%, 100% { box-shadow: 0 0 40px rgba(255, 180, 0, 0.2), 0 0 80px rgba(255, 180, 0, 0.1); }
          50% { box-shadow: 0 0 60px rgba(255, 180, 0, 0.4), 0 0 120px rgba(255, 180, 0, 0.2); }
        }

        .sale-title {
          font-size: 3rem;
          font-weight: 900;
          background: linear-gradient(to bottom, #FFD700, #FF8C00);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          filter: drop-shadow(0 0 20px rgba(255, 200, 0, 0.5));
          animation: titleBounce 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          position: relative;
          z-index: 1;
          letter-spacing: 4px;
        }

        @keyframes titleBounce {
          0% { transform: scale(0) translateY(30px); opacity: 0; }
          60% { transform: scale(1.2) translateY(-5px); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }

        .sale-amount {
          font-size: 5rem;
          font-weight: 900;
          color: white;
          text-shadow: 0 0 30px rgba(255, 255, 255, 0.5), 0 0 60px rgba(255, 200, 0, 0.3);
          animation: amountEntry 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both;
          position: relative;
          z-index: 1;
          line-height: 1.1;
        }

        @keyframes amountEntry {
          0% { transform: scale(0) translateY(20px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }

        .sale-tag {
          font-size: 1.5rem;
          font-weight: 700;
          color: #40C4FF;
          text-shadow: 0 0 20px rgba(64, 196, 255, 0.5);
          animation: tagEntry 0.6s ease-out 0.4s both;
          position: relative;
          z-index: 1;
          margin-top: 8px;
          padding: 4px 24px;
          border: 1px solid rgba(64, 196, 255, 0.3);
          border-radius: 9999px;
          background: rgba(64, 196, 255, 0.1);
        }

        @keyframes tagEntry {
          0% { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }

        .sale-fade-in {
          animation: fadeIn 0.5s ease-out 0.6s both;
          position: relative;
          z-index: 1;
        }

        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        .sale-particle {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          top: -10px;
          animation: particleFall linear forwards;
        }

        @keyframes particleFall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

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
  const [trustpilot, setTrustpilot] = useState<{
    stats: { trust_score: number; total_reviews: number } | null;
    reviews: { review_id: string; author: string; rating: number; title: string; text: string; date: string }[];
    averages: { today: number | null; todayCount: number; week: number | null; weekCount: number } | null;
  }>({ stats: null, reviews: [], averages: null });
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const prevOrderIdsRef = useRef<Set<string> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [saleQueue, setSaleQueue] = useState<SalePopupData[]>([]);
  const [activeSale, setActiveSale] = useState<SalePopupData | null>(null);
  const motivateAudioRef = useRef<HTMLAudioElement | null>(null);
  const motivatePlayedTodayRef = useRef<string | null>(null);

  // Initialize audio on first user click
  const enableSound = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio("/sounds/sale.mp3");
      audioRef.current.volume = 0.8;
    }
    if (!motivateAudioRef.current) {
      motivateAudioRef.current = new Audio("/sounds/motivate.mp3");
      motivateAudioRef.current.volume = 1.0;
    }
    // Play + pause to unlock audio context
    audioRef.current.play().then(() => {
      audioRef.current!.pause();
      audioRef.current!.currentTime = 0;
      setSoundEnabled(true);
    }).catch(() => {});
  };

  const playMotivateSound = useCallback(() => {
    if (motivateAudioRef.current && soundEnabled) {
      motivateAudioRef.current.currentTime = 0;
      motivateAudioRef.current.play().catch(() => {});
    }
  }, [soundEnabled]);

  // Auto-play motivate sound at 9:15 every morning
  useEffect(() => {
    if (!soundEnabled) return;
    const checkTime = () => {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      if (now.getHours() === 9 && now.getMinutes() === 15 && motivatePlayedTodayRef.current !== today) {
        motivatePlayedTodayRef.current = today;
        playMotivateSound();
      }
    };
    const interval = setInterval(checkTime, 30_000); // check every 30s
    checkTime();
    return () => clearInterval(interval);
  }, [soundEnabled, playMotivateSound]);

  const playSaleSound = useCallback(() => {
    if (audioRef.current && soundEnabled) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [soundEnabled]);

  // Process sale queue: show next popup when current one finishes
  useEffect(() => {
    if (!activeSale && saleQueue.length > 0) {
      setActiveSale(saleQueue[0]);
      setSaleQueue((q) => q.slice(1));
    }
  }, [activeSale, saleQueue]);

  const fetchAll = useCallback(async () => {
    const params = new URLSearchParams({ period, storeId: "all" });

    try {
      const [salesRes, lbRes, csRes, viewsRes, bonusRes, ordersRes, tpRes] = await Promise.allSettled([
        fetch(`/api/stats?${params}`),
        fetch(`/api/leaderboard?${params}`),
        fetch(`/api/cs/overview?${new URLSearchParams({ period, time_series: "false" })}`),
        fetch("/api/cs/views"),
        fetch("/api/bonuses"),
        fetch(`/api/orders?${params}&limit=10`),
        fetch("/api/trustpilot"),
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
      let freshOrders: Order[] = [];
      if (ordersRes.status === "fulfilled" && ordersRes.value.ok) {
        const d = await ordersRes.value.json();
        freshOrders = d.orders || [];
        setOrders(freshOrders);
      }
      if (tpRes.status === "fulfilled" && tpRes.value.ok) {
        const d = await tpRes.value.json();
        setTrustpilot({ stats: d.stats, reviews: d.reviews || [], averages: d.averages || null });
      }
      if (bonusRes.status === "fulfilled" && bonusRes.value.ok) {
        const d = await bonusRes.value.json();
        const configs: BonusConfig[] = (d.configs || []).filter(
          (c: BonusConfig) => c.is_active && c.scope === "group"
        );
        if (configs.length > 0) {
          // Fetch sales for each unique bonus period (weekly, monthly, all_time)
          const bonusPeriods = Array.from(new Set(configs.map((c) => c.period)));
          const periodSalesMap: Record<string, number> = {};
          // Reuse already-fetched data if period matches
          const periodToApiPeriod: Record<string, string> = {
            weekly: "week",
            monthly: "month",
            all_time: "year",
          };
          await Promise.all(
            bonusPeriods.map(async (bp) => {
              const apiPeriod = periodToApiPeriod[bp] || "month";
              if (apiPeriod === period) {
                // Already fetched above
                periodSalesMap[bp] = teamSalesTotal;
              } else {
                try {
                  const res = await fetch(`/api/stats?${new URLSearchParams({ period: apiPeriod, storeId: "all" })}`);
                  if (res.ok) {
                    const data = await res.json();
                    periodSalesMap[bp] = data.stats?.netRevenue || 0;
                  }
                } catch {
                  periodSalesMap[bp] = 0;
                }
              }
            })
          );

          const progress: BonusProgress[] = configs.map((config) => {
            const teamSales = periodSalesMap[config.period] ?? teamSalesTotal;
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

      // Detect new orders → show popup + play sound
      const freshIds = new Set(freshOrders.map((o) => o.id));
      if (prevOrderIdsRef.current !== null && freshOrders.length > 0) {
        const newOrders = freshOrders.filter((o) => !prevOrderIdsRef.current!.has(o.id));
        if (newOrders.length > 0) {
          playSaleSound();
          const newSales: SalePopupData[] = newOrders.map((o) => ({
            amount: o.total_paid,
            tag: o.tag || "Onbekend",
            orderNumber: o.order_number,
          }));
          setSaleQueue((q) => [...q, ...newSales]);
        }
      }
      prevOrderIdsRef.current = freshIds;

      setLastRefresh(new Date());
    } catch (err) {
      console.error("TV fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [period, playSaleSound]);

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
    <div className="flex h-screen flex-col gap-2 px-20 py-20">
      {/* Sale Popup Overlay */}
      {activeSale && (
        <SalePopup sale={activeSale} onDone={() => setActiveSale(null)} />
      )}
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
        <div className="flex items-center gap-3 text-sm text-gray-400">
          <button
            onClick={enableSound}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              soundEnabled
                ? "bg-green-900/50 text-green-400 border border-green-800"
                : "bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700"
            }`}
          >
            {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            {soundEnabled ? "Geluid aan" : "Geluid activeren"}
          </button>
          {soundEnabled && (
            <button
              onClick={playMotivateSound}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors bg-orange-900/50 text-orange-400 border border-orange-800 hover:bg-orange-800/50"
            >
              <Megaphone className="h-5 w-5" />
              Motiveer Team
            </button>
          )}
          <RefreshCw className="h-5 w-5" />
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

        {/* Trustpilot + Team Bonuses — 3 cols */}
        <div className="col-span-3 flex flex-col gap-2 overflow-hidden">
          {/* Trustpilot */}
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Star className="h-4 w-4 text-green-400" />
              <h3 className="text-sm font-semibold text-gray-300">Trustpilot</h3>
            </div>
            {trustpilot.stats ? (
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-green-400">
                    {trustpilot.stats.trust_score}
                  </span>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3.5 w-3.5 ${
                          s <= Math.round(trustpilot.stats!.trust_score)
                            ? "text-green-400 fill-green-400"
                            : "text-gray-600"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">
                    {trustpilot.stats.total_reviews.toLocaleString("nl-NL")} reviews
                  </span>
                </div>
                {/* Week average */}
                {trustpilot.averages && (
                  <div className="mt-2 rounded-md bg-gray-800 px-2 py-1.5">
                    <p className="text-[10px] text-gray-500">Deze week</p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-bold">
                        {trustpilot.averages.week !== null ? trustpilot.averages.week : "—"}
                      </span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-2.5 w-2.5 ${
                              trustpilot.averages!.week !== null && s <= Math.round(trustpilot.averages!.week)
                                ? "text-green-400 fill-green-400"
                                : "text-gray-600"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-gray-500">
                        ({trustpilot.averages.weekCount} reviews)
                      </span>
                    </div>
                  </div>
                )}
                {/* Latest reviews */}
                {trustpilot.reviews.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {trustpilot.reviews.slice(0, 3).map((r) => (
                      <div key={r.review_id} className="rounded-md bg-gray-800 px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`h-2.5 w-2.5 ${
                                  s <= r.rating ? "text-green-400 fill-green-400" : "text-gray-600"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] text-gray-500">{r.author}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] font-medium text-gray-300 truncate">
                          {r.title}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-600">Geen data</p>
            )}
          </div>

          {/* Team Bonuses */}
          <div className="flex-1 rounded-lg border border-gray-800 bg-gray-900 p-3 overflow-hidden">
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
