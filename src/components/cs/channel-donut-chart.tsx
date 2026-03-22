"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { ChannelStats } from "@/types/gorgias";

interface ChannelDonutChartProps {
  channels: ChannelStats[];
  loading?: boolean;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-lg border bg-white px-3 py-2 shadow-md">
      <p className="text-sm font-semibold text-gray-900">
        {data.channelLabel}
      </p>
      <p className="text-sm text-gray-600">
        {data.ticketCount.toLocaleString("nl-NL")} tickets ({data.percentage}%)
      </p>
    </div>
  );
}

export function ChannelDonutChart({
  channels,
  loading,
}: ChannelDonutChartProps) {
  if (loading) {
    return (
      <div className="flex h-64 animate-pulse items-center justify-center">
        <div className="h-48 w-48 rounded-full bg-gray-100" />
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-gray-400">Geen data</p>
      </div>
    );
  }

  const totalTickets = channels.reduce((sum, c) => sum + c.ticketCount, 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={channels}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={110}
            paddingAngle={2}
            dataKey="ticketCount"
            nameKey="channelLabel"
          >
            {channels.map((ch) => (
              <Cell key={ch.channel} fill={ch.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <p className="text-3xl font-bold text-gray-900">
          {totalTickets.toLocaleString("nl-NL")}
        </p>
        <p className="text-xs text-gray-500">tickets totaal</p>
      </div>
    </div>
  );
}
