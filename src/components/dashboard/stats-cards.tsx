"use client";

import { useEffect, useState } from "react";
import { DollarSign, ShoppingCart, TrendingUp, RotateCcw } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { DashboardStats, PeriodFilter, DateRange } from "@/types";

interface StatsCardsProps {
  period: PeriodFilter;
  dateRange?: DateRange;
  storeId: string;
}

export function StatsCards({ period, dateRange, storeId }: StatsCardsProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ period, storeId });
        if (dateRange) {
          params.set("from", dateRange.from.toISOString());
          params.set("to", dateRange.to.toISOString());
        }
        const res = await fetch(`/api/stats?${params}`);
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
        }
      } catch {
        console.error("Failed to fetch stats");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [period, dateRange, storeId]);

  const cards = [
    {
      title: "Netto Omzet",
      value: stats ? formatCurrency(stats.netRevenue) : "-",
      icon: DollarSign,
      color: "text-green-600 bg-green-50",
    },
    {
      title: "Aantal Orders",
      value: stats ? formatNumber(stats.totalOrders) : "-",
      icon: ShoppingCart,
      color: "text-blue-600 bg-blue-50",
    },
    {
      title: "Gem. Orderwaarde",
      value: stats ? formatCurrency(stats.averageOrderValue) : "-",
      icon: TrendingUp,
      color: "text-purple-600 bg-purple-50",
    },
    {
      title: "Refunds",
      value: stats ? formatCurrency(stats.totalRefunds) : "-",
      icon: RotateCcw,
      color: "text-red-600 bg-red-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className="rounded-xl border bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">{card.title}</p>
            <div className={`rounded-lg p-2 ${card.color}`}>
              <card.icon className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {loading ? "..." : card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
