"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { BonusProgress } from "@/types";

export function BonusProgressPanel() {
  const [progress, setProgress] = useState<BonusProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch from /api/bonuses/progress
    setProgress([]);
    setLoading(false);
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
              <h4 className="font-semibold text-gray-900">
                {item.bonusConfig.name}
              </h4>
              <span className="text-sm text-gray-500">
                {item.bonusConfig.period === "weekly"
                  ? "Deze week"
                  : "Deze maand"}
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
              <span className="text-sm text-gray-600">Verdiende bonus:</span>
              <span className="text-lg font-bold text-green-600">
                {formatCurrency(item.earnedBonus)}
              </span>
            </div>

            {/* Next tier hint */}
            {item.nextTier && (
              <p className="mt-2 text-xs text-gray-500">
                Nog {formatCurrency(item.nextTier.threshold - item.currentSales)}{" "}
                nodig voor de volgende staffel (
                {formatCurrency(item.nextTier.bonus)} bonus)
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
