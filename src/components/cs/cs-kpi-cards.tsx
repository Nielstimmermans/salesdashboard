"use client";

import {
  Ticket,
  Clock,
  CheckCircle,
  Zap,
  TrendingUp,
  TrendingDown,
  Inbox,
} from "lucide-react";
import type { CSOverviewData } from "@/types/gorgias";
import type { ViewTicketCount } from "@/lib/gorgias";

interface CSKpiCardsProps {
  data: CSOverviewData;
  viewCounts?: ViewTicketCount[];
  loading?: boolean;
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return mins > 0 ? `${hours}u ${mins}m` : `${hours}u`;
}

function formatPercent(value: number): string {
  return `${Math.round(value * 10) / 10}%`;
}

function ChangeIndicator({
  current,
  previous,
  inverted = false,
}: {
  current: number;
  previous: number | null;
  inverted?: boolean;
}) {
  if (previous === null || previous === 0) return null;
  const change = ((current - previous) / previous) * 100;
  const isPositive = inverted ? change < 0 : change > 0;

  return (
    <span
      className={`flex items-center gap-0.5 text-xs font-medium ${
        isPositive ? "text-green-600" : "text-red-500"
      }`}
    >
      {isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {Math.abs(Math.round(change))}%
    </span>
  );
}

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
  change?: React.ReactNode;
}

function KpiCard({ title, value, subtitle, icon, iconBg, change }: KpiCardProps) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {change}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-gray-400">{subtitle}</p>
          )}
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div className="mt-2 h-7 w-16 rounded bg-gray-200" />
          <div className="mt-2 h-3 w-32 rounded bg-gray-100" />
        </div>
        <div className="h-10 w-10 rounded-lg bg-gray-200" />
      </div>
    </div>
  );
}

const VIEW_ORDER = [
  "new- one touch",
  "sales",
  "proefrit aan huis",
  "slechte reviews",
  "retour, annuleringen",
  "garnatie & b2b",
  "wouter check",
  "chargeback",
  "omclosen",
];

function sortAndFilterViews(views: ViewTicketCount[]): ViewTicketCount[] {
  return VIEW_ORDER
    .map((ordered) => {
      const target = ordered.toLowerCase();
      return views.find((v) => v.name.toLowerCase().includes(target) || target.includes(v.name.toLowerCase()));
    })
    .filter((v): v is ViewTicketCount => v !== undefined);
}

export function CSKpiCards({ data, viewCounts, loading }: CSKpiCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  const prev = data.previousPeriod;

  const cards: KpiCardProps[] = [
    {
      title: "Tickets aangemaakt",
      value: data.ticketsCreated.toLocaleString("nl-NL"),
      subtitle: `${data.ticketsOpen} nog open`,
      icon: <Ticket className="h-5 w-5 text-indigo-600" />,
      iconBg: "bg-indigo-50",
      change: prev ? (
        <ChangeIndicator
          current={data.ticketsCreated}
          previous={prev.ticketsCreated}
        />
      ) : undefined,
    },
    {
      title: "Tickets gesloten",
      value: data.ticketsClosed.toLocaleString("nl-NL"),
      subtitle: `${data.ticketsReplied} beantwoord`,
      icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      iconBg: "bg-green-50",
      change: prev ? (
        <ChangeIndicator
          current={data.ticketsClosed}
          previous={prev.ticketsClosed}
        />
      ) : undefined,
    },
    {
      title: "Eerste responstijd",
      value: formatDuration(data.avgFirstResponseTime),
      icon: <Clock className="h-5 w-5 text-orange-600" />,
      iconBg: "bg-orange-50",
      change: prev ? (
        <ChangeIndicator
          current={data.avgFirstResponseTime}
          previous={prev.avgFirstResponseTime}
          inverted
        />
      ) : undefined,
    },
    {
      title: "Oplostijd",
      value: formatDuration(data.avgResolutionTime),
      icon: <Zap className="h-5 w-5 text-yellow-600" />,
      iconBg: "bg-yellow-50",
      change: prev ? (
        <ChangeIndicator
          current={data.avgResolutionTime}
          previous={prev.avgResolutionTime}
          inverted
        />
      ) : undefined,
    },
    {
      title: "One-touch rate",
      value: formatPercent(data.oneTouchRate),
      subtitle: "Opgelost in 1 antwoord",
      icon: <CheckCircle className="h-5 w-5 text-teal-600" />,
      iconBg: "bg-teal-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {cards.map((card) => (
          <KpiCard key={card.title} {...card} />
        ))}
      </div>

      {/* View ticket counts */}
      {viewCounts && (() => {
        const filtered = sortAndFilterViews(viewCounts);
        return filtered.length > 0 && (
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="border-b px-5 py-3">
            <h3 className="text-sm font-semibold text-gray-900">
              Openstaande tickets per view
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filtered.map((view) => (
              <div
                key={view.id}
                className="flex items-center gap-3 bg-white px-4 py-3"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
                  <Inbox className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-gray-500">{view.name}</p>
                  <p className="text-lg font-bold text-gray-900">{view.count}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        );
      })()}
    </div>
  );
}
