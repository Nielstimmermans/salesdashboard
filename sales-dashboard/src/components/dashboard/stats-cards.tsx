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
    // TODO: Fetch stats from /api/stats with filters
    // For now, show placeholder data
    setStats({
      totalRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      totalRefunds: 0,
      netRevenue: 0,
    });
    setLoading(false);
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
