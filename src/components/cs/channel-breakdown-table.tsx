"use client";

import type { ChannelStats } from "@/types/gorgias";

interface ChannelBreakdownTableProps {
  channels: ChannelStats[];
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

function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b">
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 w-16 rounded bg-gray-100" />
        </td>
      ))}
    </tr>
  );
}

export function ChannelBreakdownTable({
  channels,
  loading,
}: ChannelBreakdownTableProps) {
  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="border-b px-6 py-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Kanaalverdeling
        </h3>
        <p className="text-sm text-gray-500">
          Performance per communicatiekanaal
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b bg-gray-50/50 text-gray-500">
              <th className="px-6 py-3 font-medium">Kanaal</th>
              <th className="px-4 py-3 font-medium text-right">Tickets</th>
              <th className="px-4 py-3 font-medium text-right">Aandeel</th>
              <th className="px-4 py-3 font-medium text-right">
                Eerste respons
              </th>
              <th className="px-4 py-3 font-medium text-right">Oplostijd</th>
              <th className="px-4 py-3 font-medium text-right">CSAT</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))
            ) : channels.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-8 text-center text-gray-400"
                >
                  Geen kanaaldata beschikbaar
                </td>
              </tr>
            ) : (
              channels.map((ch) => (
                <tr
                  key={ch.channel}
                  className="border-b last:border-0 hover:bg-gray-50/50 transition-colors"
                >
                  {/* Channel name with color dot */}
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-3 w-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: ch.color }}
                      />
                      <span className="font-medium text-gray-900">
                        {ch.channelLabel}
                      </span>
                    </div>
                  </td>

                  {/* Ticket count */}
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {ch.ticketCount.toLocaleString("nl-NL")}
                  </td>

                  {/* Percentage with bar */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(ch.percentage, 100)}%`,
                            backgroundColor: ch.color,
                          }}
                        />
                      </div>
                      <span className="w-12 text-right text-gray-600">
                        {ch.percentage}%
                      </span>
                    </div>
                  </td>

                  {/* First response time */}
                  <td className="px-4 py-3 text-right text-gray-600">
                    {formatDuration(ch.avgFirstResponseTime)}
                  </td>

                  {/* Resolution time */}
                  <td className="px-4 py-3 text-right text-gray-600">
                    {formatDuration(ch.avgResolutionTime)}
                  </td>

                  {/* CSAT */}
                  <td className="px-4 py-3 text-right">
                    {ch.csatScore !== null ? (
                      <span
                        className={`font-medium ${
                          ch.csatScore >= 4
                            ? "text-green-600"
                            : ch.csatScore >= 3
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
                        {ch.csatScore.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
