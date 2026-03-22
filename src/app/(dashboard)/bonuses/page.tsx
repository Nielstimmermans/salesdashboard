"use client";

import { useRole } from "@/hooks/use-role";
import { BonusConfigPanel } from "@/components/dashboard/bonus-config-panel";
import { BonusProgressPanel } from "@/components/dashboard/bonus-progress-panel";

export default function BonusesPage() {
  const { isAdmin, loading } = useRole();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-400">Laden...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Bonussen</h2>
        <p className="text-sm text-gray-500">
          {isAdmin
            ? "Configureer bonussen en bekijk voortgang van het team"
            : "Bekijk je bonusvoortgang en doelen"}
        </p>
      </div>

      {isAdmin ? (
        <div className="space-y-8">
          <BonusConfigPanel />
          <BonusProgressPanel />
        </div>
      ) : (
        <BonusProgressPanel />
      )}
    </div>
  );
}
