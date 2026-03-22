"use client";

import {
  Ticket,
  Clock,
  CheckCircle,
  Zap,
  ThumbsUp,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Bot,
} from "lucide-react";
import type { CSOverviewData } from "@/types/gorgias";

interface CSKpiCardsProps {
  data: CSOverviewData;
  loading?: boolean;
}

function formatDuration(seconds: number): string {
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

export function CSKpiCards({ data, loading }: CSKpiCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
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
      subtitle: `Menselijk: ${formatDuration(data.avgHumanFirstResponseTime)}`,
      icon: <Clock className="h-5 w-5 text-orange-600" />,
      iconBg: "bg-orange-50",
      change: prev ? (
        <ChangeIndicator
          current={data.avgFirstResponseTime}
          previous={prev.avgFirstResponseTime}
          inverted // lower is better
        />
      ) : undefined,
    },
    {
      title: "Oplostijd",
      value: formatDuration(data.avgResolutionTime),
      subtitle: `Verwerkingstijd: ${formatDuration(data.avgHandleTime)}`,
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
      title: "CSAT Score",
      value:
        data.csatScore !== null
          ? `${(data.csatScore).toFixed(1)} / 5`
          : "—",
      subtitle: `${data.csatTotal} responses (${formatPercent(data.csatResponseRate)} rate)`,
      icon: <ThumbsUp className="h-5 w-5 text-blue-600" />,
      iconBg: "bg-blue-50",
      change:
        prev && data.csatScore !== null ? (
          <ChangeIndicator
            current={data.csatScore}
            previous={prev.csatScore}
          />
        ) : undefined,
    },
    {
      title: "SLA Compliance",
      value: formatPercent(data.slaComplianceRate),
      icon: <ShieldCheck className="h-5 w-5 text-emerald-600" />,
      iconBg: "bg-emerald-50",
    },
    {
      title: "One-touch rate",
      value: formatPercent(data.oneTouchRate),
      subtitle: "Opgelost in 1 antwoord",
      icon: <CheckCircle className="h-5 w-5 text-teal-600" />,
      iconBg: "bg-teal-50",
    },
    {
      title: "Automatisering",
      value: formatPercent(data.automationRate),
      subtitle: `Zero-touch: ${formatPercent(data.zeroTouchRate)}`,
      icon: <Bot className="h-5 w-5 text-purple-600" />,
      iconBg: "bg-purple-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <KpiCard key={card.title} {...card} />
      ))}
    </div>
  );
}
