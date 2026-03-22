"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { PeriodFilter, DateRange, LeaderboardEntry } from "@/types";

interface LeaderboardViewProps {
  period: PeriodFilter;
  dateRange?: DateRange;
  storeId: string;
}

const podiumEmoji = ["🥇", "🥈", "🥉"];

export function LeaderboardView({ period, dateRange, storeId }: LeaderboardViewProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ period, storeId });
        if (dateRange) {
          params.set("from", dateRange.from.toISOString());
          params.set("to", dateRange.to.toISOString());
        }
        const res = await fetch(`/api/leaderboard?${params}`);
        if (res.ok) {
          const data = await res.json();
          setEntries(data.entries || []);
        }
      } catch {
        console.error("Failed to fetch leaderboard");
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, [period, dateRange, storeId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-400">Laden...</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border bg-white shadow-sm">
        <p className="text-gray-400">Nog geen salesdata beschikbaar</p>
      </div>
    );
  }

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="space-y-6">
      {/* Podium - Top 3 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {top3.map((entry, idx) => (
          <div
            key={entry.tag}
            className={`relative overflow-hidden rounded-xl border bg-white p-6 shadow-sm ${
              idx === 0 ? "md:order-2 ring-2 ring-yellow-400" : ""
            } ${idx === 1 ? "md:order-1" : ""} ${
              idx === 2 ? "md:order-3" : ""
            }`}
          >
            <div className="absolute right-4 top-4 text-4xl">
              {podiumEmoji[idx]}
            </div>
            <p className="text-sm font-medium text-gray-500">#{entry.rank}</p>
            <p className="mt-1 text-xl font-bold text-gray-900">
              {entry.employeeName}
            </p>
            <p className="mt-2 text-2xl font-bold text-primary">
              {formatCurrency(entry.netRevenue)}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {entry.orderCount} orders
            </p>
            {entry.changePercent !== 0 && (
              <div
                className={`mt-2 flex items-center gap-1 text-sm ${
                  entry.changePercent > 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {entry.changePercent > 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {formatPercent(Math.abs(entry.changePercent))} t.o.v. vorige
                periode
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Rest of the leaderboard */}
      {rest.length > 0 && (
        <div className="rounded-xl border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-500">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Medewerker</th>
                <th className="px-4 py-3 font-medium text-right">Omzet</th>
                <th className="px-4 py-3 font-medium text-right">Orders</th>
                <th className="px-4 py-3 font-medium text-right">Verschil</th>
              </tr>
            </thead>
            <tbody>
              {rest.map((entry) => (
                <tr key={entry.tag} className="border-b last:border-0">
                  <td className="px-4 py-3 text-gray-500">{entry.rank}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {entry.employeeName}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {formatCurrency(entry.netRevenue)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {entry.orderCount}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={
                        entry.changePercent > 0
                          ? "text-green-600"
                          : entry.changePercent < 0
                          ? "text-red-600"
                          : "text-gray-400"
                      }
                    >
                      {entry.changePercent > 0 ? "+" : ""}
                      {formatPercent(entry.changePercent)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
