"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import type { ChannelTimeSeries, ChannelStats } from "@/types/gorgias";
import { CHANNEL_LABELS, CHANNEL_COLORS } from "@/types/gorgias";

interface ChannelStackedChartProps {
  timeSeries: ChannelTimeSeries[];
  channels: ChannelStats[];
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

export function ChannelStackedChart({
  timeSeries,
  channels,
  loading,
  granularity = "day",
}: ChannelStackedChartProps) {
  if (loading) {
    return (
      <div className="flex h-72 animate-pulse items-center justify-center rounded-xl border bg-white shadow-sm">
        <div className="h-48 w-full mx-6 rounded bg-gray-100" />
      </div>
    );
  }

  if (timeSeries.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border bg-white shadow-sm">
        <p className="text-sm text-gray-400">Geen data beschikbaar</p>
      </div>
    );
  }

  // Get top channels (max 6 for readability, group rest as "Overig")
  const topChannels = channels.slice(0, 6).map((c) => c.channel);

  // Flatten time series for Recharts
  const chartData = timeSeries.map((ts) => {
    const row: Record<string, string | number> = {
      date: formatDateLabel(ts.date, granularity),
    };
    let otherCount = 0;

    for (const [channel, count] of Object.entries(ts.channels)) {
      if (topChannels.includes(channel)) {
        row[channel] = count;
      } else {
        otherCount += count;
      }
    }

    if (otherCount > 0) {
      row["other"] = otherCount;
    }

    return row;
  });

  const allBars = [
    ...topChannels,
    ...(chartData.some((d) => (d["other"] as number) > 0) ? ["other"] : []),
  ];

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        Tickets per kanaal over tijd
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="date"
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
            formatter={(value: number, name: string) => [
              value.toLocaleString("nl-NL"),
              CHANNEL_LABELS[name] || (name === "other" ? "Overig" : name),
            ]}
          />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            formatter={(name: string) =>
              CHANNEL_LABELS[name] || (name === "other" ? "Overig" : name)
            }
          />
          {allBars.map((channel) => (
            <Bar
              key={channel}
              dataKey={channel}
              stackId="channels"
              fill={
                CHANNEL_COLORS[channel] ||
                (channel === "other" ? "#cbd5e1" : "#94a3b8")
              }
              radius={
                channel === allBars[allBars.length - 1]
                  ? [2, 2, 0, 0]
                  : [0, 0, 0, 0]
              }
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
