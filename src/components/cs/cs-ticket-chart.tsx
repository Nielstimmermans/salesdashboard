"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import type { CSOverviewTimeSeries } from "@/types/gorgias";

interface CSTicketChartProps {
  data: CSOverviewTimeSeries[];
  loading?: boolean;
  granularity?: "hour" | "day" | "week" | "month";
}

function formatDateLabel(dateStr: string, granularity: string): string {
  const date = parseISO(dateStr);
  switch (granularity) {
    case "hour":
      return format(date, "HH:mm", { locale: nl });
    case "day":
      return format(date, "d MMM", { locale: nl });
    case "week":
      return format(date, "'W'w", { locale: nl });
    case "month":
      return format(date, "MMM yyyy", { locale: nl });
    default:
      return format(date, "d MMM", { locale: nl });
  }
}

export function CSTicketChart({
  data,
  loading,
  granularity = "day",
}: CSTicketChartProps) {
  if (loading) {
    return (
      <div className="flex h-72 animate-pulse items-center justify-center rounded-xl border bg-white shadow-sm">
        <div className="h-48 w-full mx-6 rounded bg-gray-100" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border bg-white shadow-sm">
        <p className="text-sm text-gray-400">Geen data beschikbaar</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    label: formatDateLabel(d.date, granularity),
  }));

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        Tickets over tijd
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="fillCreated" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="fillClosed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              fontSize: "13px",
            }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            formatter={(value: string) =>
              value === "ticketsCreated" ? "Aangemaakt" : "Gesloten"
            }
          />
          <Area
            type="monotone"
            dataKey="ticketsCreated"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#fillCreated)"
            name="ticketsCreated"
          />
          <Area
            type="monotone"
            dataKey="ticketsClosed"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#fillClosed)"
            name="ticketsClosed"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
