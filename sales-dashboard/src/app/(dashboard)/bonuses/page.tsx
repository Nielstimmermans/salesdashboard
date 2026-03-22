"use client";

import { BonusConfigPanel } from "@/components/dashboard/bonus-config-panel";
import { BonusProgressPanel } from "@/components/dashboard/bonus-progress-panel";

export default function BonusesPage() {
  // TODO: Check user role from Clerk/Supabase to determine view
  const isAdmin = true; // Replace with actual role check

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
