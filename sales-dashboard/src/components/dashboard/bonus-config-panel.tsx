"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { BonusConfig } from "@/types";

export function BonusConfigPanel() {
  const [configs, setConfigs] = useState<BonusConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    // TODO: Fetch from /api/bonuses
    setConfigs([]);
    setLoading(false);
  }, []);

  const typeLabels = {
    fixed: "Vast bedrag",
    percentage: "Percentage",
    tiered: "Staffel",
  };

  const periodLabels = {
    weekly: "Wekelijks",
    monthly: "Maandelijks",
  };

  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Bonus Configuratie
          </h3>
          <p className="text-sm text-gray-500">
            Beheer wekelijkse en maandelijkse bonussen
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nieuwe bonus
        </button>
      </div>

      {/* TODO: Bonus creation/edit form modal */}
      {showForm && (
        <div className="border-b bg-gray-50 p-4">
          <p className="text-sm text-gray-500">
            {/* TODO: Implementeer bonusformulier met velden voor:
                - Naam
                - Type (fixed/percentage/tiered)
                - Periode (weekly/monthly)
                - Target bedrag
                - Bonuswaarde / percentage / tiers
                - Toewijzen aan medewerkers of iedereen
            */}
            Bonusformulier wordt hier geïmplementeerd
          </p>
          <button
            onClick={() => setShowForm(false)}
            className="mt-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Annuleren
          </button>
        </div>
      )}

      <div className="divide-y">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Laden...</div>
        ) : configs.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            Nog geen bonussen geconfigureerd
          </div>
        ) : (
          configs.map((config) => (
            <div
              key={config.id}
              className="flex items-center justify-between p-4"
            >
              <div>
                <p className="font-medium text-gray-900">{config.name}</p>
                <p className="text-sm text-gray-500">
                  {typeLabels[config.type]} • {periodLabels[config.period]}
                  {config.target_amount &&
                    ` • Target: ${formatCurrency(config.target_amount)}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    config.is_active
                      ? "bg-green-50 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {config.is_active ? "Actief" : "Inactief"}
                </span>
                <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                  <Pencil className="h-4 w-4" />
                </button>
                <button className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
