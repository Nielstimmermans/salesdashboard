"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { BonusProgress } from "@/types";

export function BonusProgressPanel() {
  const [progress, setProgress] = useState<BonusProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProgress() {
      try {
        const res = await fetch("/api/bonuses/progress");
        if (res.ok) {
          const data = await res.json();
          setProgress(data.progress || []);
        }
      } catch {
        console.error("Failed to fetch bonus progress");
      } finally {
        setLoading(false);
      }
    }
    fetchProgress();
  }, []);

  if (loading) {
    return <div className="text-center text-gray-400">Laden...</div>;
  }

  if (progress.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
        <p className="text-gray-400">Geen actieve bonussen</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">
        Bonus Voortgang
      </h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {progress.map((item) => (
          <div
            key={item.bonusConfig.id}
            className="rounded-xl border bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-900">
                  {item.bonusConfig.name}
                </h4>
                {item.isGroup && (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    Groep
                  </span>
                )}
              </div>
              <span className="text-sm text-gray-500">
                {item.bonusConfig.period === "weekly"
                  ? "Deze week"
                  : item.bonusConfig.period === "monthly"
                  ? "Deze maand"
                  : "All-time"}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">
                  {formatCurrency(item.currentSales)} van{" "}
                  {formatCurrency(item.targetAmount)}
                </span>
                <span className="font-medium text-primary">
                  {formatPercent(item.progressPercent)}
                </span>
              </div>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{
                    width: `${Math.min(100, item.progressPercent)}%`,
                  }}
                />
              </div>
            </div>

            {/* Bonus info */}
            <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 p-3">
              <span className="text-sm text-gray-600">Beloning:</span>
              <span className="text-lg font-bold text-green-600">
                {item.bonusConfig.reward_label && item.progressPercent >= 100
                  ? item.bonusConfig.reward_label
                  : item.bonusConfig.reward_label && item.progressPercent < 100
                  ? `${item.bonusConfig.reward_label} (nog niet bereikt)`
                  : formatCurrency(item.earnedBonus)}
                {item.bonusConfig.reward_label && item.earnedBonus > 0 &&
                  ` + ${formatCurrency(item.earnedBonus)}`}
              </span>
            </div>

            {/* Next tier hint */}
            {item.nextTier && (
              <p className="mt-2 text-xs text-gray-500">
                Nog {formatCurrency(item.nextTier.threshold - item.currentSales)}{" "}
                nodig voor de volgende staffel
                {item.nextTier.reward_label
                  ? ` (${item.nextTier.reward_label})`
                  : ` (${formatCurrency(item.nextTier.bonus)} bonus)`}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
