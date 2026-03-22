"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Save, Users, User } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { BonusConfig, BonusTier, Employee } from "@/types";

interface BonusFormData {
  name: string;
  type: "fixed" | "percentage" | "tiered";
  period: "weekly" | "monthly" | "all_time";
  scope: "individual" | "group";
  target_amount: string;
  bonus_value: string;
  percentage_value: string;
  tiers: BonusTier[];
  apply_to_all: boolean;
  employee_ids: string[];
}

const emptyForm: BonusFormData = {
  name: "",
  type: "fixed",
  period: "monthly",
  scope: "individual",
  target_amount: "",
  bonus_value: "",
  percentage_value: "",
  tiers: [{ threshold: 0, bonus: 0 }],
  apply_to_all: true,
  employee_ids: [],
};

export function BonusConfigPanel() {
  const [configs, setConfigs] = useState<BonusConfig[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BonusFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfigs = async () => {
    try {
      const res = await fetch("/api/bonuses");
      if (res.ok) {
        const data = await res.json();
        setConfigs(data.configs || []);
      }
    } catch {
      console.error("Failed to fetch bonus configs");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees");
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees || []);
      }
    } catch {
      console.error("Failed to fetch employees");
    }
  };

  useEffect(() => {
    fetchConfigs();
    fetchEmployees();
  }, []);

  const typeLabels = {
    fixed: "Vast bedrag",
    percentage: "Percentage",
    tiered: "Staffel",
  };

  const periodLabels: Record<string, string> = {
    weekly: "Wekelijks",
    monthly: "Maandelijks",
    all_time: "Altijd",
  };

  const openNewForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError(null);
    setShowForm(true);
  };

  const openEditForm = (config: BonusConfig & { bonus_assignments?: { employee_id: string }[] }) => {
    setForm({
      name: config.name,
      type: config.type,
      period: config.period,
      scope: config.scope || "individual",
      target_amount: config.target_amount?.toString() || "",
      bonus_value: config.bonus_value?.toString() || "",
      percentage_value: config.percentage_value?.toString() || "",
      tiers: config.tiers && config.tiers.length > 0
        ? config.tiers
        : [{ threshold: 0, bonus: 0 }],
      apply_to_all: config.apply_to_all,
      employee_ids: config.bonus_assignments?.map((a) => a.employee_id) || [],
    });
    setEditingId(config.id);
    setError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setError(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Naam is verplicht");
      return;
    }
    if (!form.target_amount || parseFloat(form.target_amount) <= 0) {
      setError("Target bedrag is verplicht");
      return;
    }

    setSaving(true);
    setError(null);

    const body: Record<string, unknown> = {
      name: form.name.trim(),
      type: form.type,
      period: form.period,
      scope: form.scope,
      target_amount: parseFloat(form.target_amount),
      apply_to_all: form.apply_to_all,
      employee_ids: form.apply_to_all ? [] : form.employee_ids,
    };

    if (form.type === "fixed") {
      if (!form.bonus_value || parseFloat(form.bonus_value) <= 0) {
        setError("Bonusbedrag is verplicht");
        setSaving(false);
        return;
      }
      body.bonus_value = parseFloat(form.bonus_value);
    } else if (form.type === "percentage") {
      if (!form.percentage_value || parseFloat(form.percentage_value) <= 0) {
        setError("Percentage is verplicht");
        setSaving(false);
        return;
      }
      body.percentage_value = parseFloat(form.percentage_value);
    } else if (form.type === "tiered") {
      const validTiers = form.tiers.filter(
        (t) => t.threshold > 0 && t.bonus > 0
      );
      if (validTiers.length === 0) {
        setError("Voeg minimaal één staffel toe");
        setSaving(false);
        return;
      }
      body.tiers = validTiers.sort((a, b) => a.threshold - b.threshold);
    }

    try {
      const url = editingId ? `/api/bonuses/${editingId}` : "/api/bonuses";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Opslaan mislukt");
        setSaving(false);
        return;
      }

      closeForm();
      await fetchConfigs();
    } catch {
      setError("Opslaan mislukt — netwerk fout");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Weet je zeker dat je deze bonus wilt verwijderen?")) return;
    try {
      const res = await fetch(`/api/bonuses/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchConfigs();
      }
    } catch {
      console.error("Delete failed");
    }
  };

  const handleToggleActive = async (config: BonusConfig) => {
    try {
      await fetch(`/api/bonuses/${config.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !config.is_active }),
      });
      await fetchConfigs();
    } catch {
      console.error("Toggle failed");
    }
  };

  const addTier = () => {
    setForm((prev) => ({
      ...prev,
      tiers: [...prev.tiers, { threshold: 0, bonus: 0 }],
    }));
  };

  const removeTier = (index: number) => {
    setForm((prev) => ({
      ...prev,
      tiers: prev.tiers.filter((_, i) => i !== index),
    }));
  };

  const updateTier = (index: number, field: keyof BonusTier, value: string) => {
    setForm((prev) => ({
      ...prev,
      tiers: prev.tiers.map((t, i) =>
        i === index ? { ...t, [field]: parseFloat(value) || 0 } : t
      ),
    }));
  };

  const toggleEmployee = (empId: string) => {
    setForm((prev) => ({
      ...prev,
      employee_ids: prev.employee_ids.includes(empId)
        ? prev.employee_ids.filter((id) => id !== empId)
        : [...prev.employee_ids, empId],
    }));
  };

  const activeEmployees = employees.filter((e) => e.is_active);

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
          onClick={openNewForm}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nieuwe bonus
        </button>
      </div>

      {/* Bonus form */}
      {showForm && (
        <div className="border-b bg-gray-50 p-4">
          <div className="max-w-lg space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">
                {editingId ? "Bonus bewerken" : "Nieuwe bonus"}
              </h4>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Naam */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Naam
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Bijv. Maandbonus verkoop"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Type + Periode */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Type
                </label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      type: e.target.value as BonusFormData["type"],
                    }))
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="fixed">Vast bedrag</option>
                  <option value="percentage">Percentage</option>
                  <option value="tiered">Staffel</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Periode
                </label>
                <select
                  value={form.period}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      period: e.target.value as BonusFormData["period"],
                    }))
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="weekly">Wekelijks</option>
                  <option value="monthly">Maandelijks</option>
                  <option value="all_time">Altijd</option>
                </select>
              </div>
            </div>

            {/* Bereik: Individueel / Groep */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Bereik
              </label>
              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, scope: "individual" }))}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    form.scope === "individual"
                      ? "border-primary bg-primary/5 text-primary"
                      : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <User className="h-4 w-4" />
                  Individueel
                </button>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, scope: "group" }))}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    form.scope === "group"
                      ? "border-primary bg-primary/5 text-primary"
                      : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <Users className="h-4 w-4" />
                  Groep
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                {form.scope === "individual"
                  ? "Elke medewerker heeft een eigen target"
                  : "Gezamenlijk target voor het hele team"}
              </p>
            </div>

            {/* Target bedrag */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Target bedrag
              </label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-2 text-sm text-gray-400">€</span>
                <input
                  type="number"
                  value={form.target_amount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, target_amount: e.target.value }))
                  }
                  placeholder="5000"
                  className="w-full rounded-lg border py-2 pl-7 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Type-specific fields */}
            {form.type === "fixed" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Bonusbedrag (bij behalen target)
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-2 text-sm text-gray-400">€</span>
                  <input
                    type="number"
                    value={form.bonus_value}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, bonus_value: e.target.value }))
                    }
                    placeholder="250"
                    className="w-full rounded-lg border py-2 pl-7 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            )}

            {form.type === "percentage" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Percentage van omzet boven target
                </label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    value={form.percentage_value}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, percentage_value: e.target.value }))
                    }
                    placeholder="5"
                    step="0.5"
                    className="w-full rounded-lg border px-3 py-2 pr-8 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="absolute right-3 top-2 text-sm text-gray-400">%</span>
                </div>
              </div>
            )}

            {form.type === "tiered" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Staffels
                </label>
                <div className="mt-2 space-y-2">
                  {form.tiers.map((tier, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-2 text-xs text-gray-400">
                          Vanaf €
                        </span>
                        <input
                          type="number"
                          value={tier.threshold || ""}
                          onChange={(e) =>
                            updateTier(i, "threshold", e.target.value)
                          }
                          className="w-full rounded-lg border py-2 pl-16 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-2 text-xs text-gray-400">
                          Bonus €
                        </span>
                        <input
                          type="number"
                          value={tier.bonus || ""}
                          onChange={(e) =>
                            updateTier(i, "bonus", e.target.value)
                          }
                          className="w-full rounded-lg border py-2 pl-16 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      {form.tiers.length > 1 && (
                        <button
                          onClick={() => removeTier(i)}
                          className="rounded p-1 text-gray-400 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addTier}
                    className="text-sm text-primary hover:underline"
                  >
                    + Staffel toevoegen
                  </button>
                </div>
              </div>
            )}

            {/* Apply to all + employee select */}
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.apply_to_all}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, apply_to_all: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">
                  Geldt voor alle medewerkers
                </span>
              </label>

              {!form.apply_to_all && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Selecteer medewerkers
                  </label>
                  <div className="mt-1 max-h-48 space-y-1 overflow-y-auto rounded-lg border bg-white p-2">
                    {activeEmployees.length === 0 ? (
                      <p className="p-2 text-sm text-gray-400">
                        Geen medewerkers gevonden
                      </p>
                    ) : (
                      activeEmployees.map((emp) => (
                        <label
                          key={emp.id}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={form.employee_ids.includes(emp.id)}
                            onChange={() => toggleEmployee(emp.id)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="text-sm text-gray-700">
                            {emp.name}
                          </span>
                          <span className="text-xs text-gray-400">
                            {emp.tag}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                  {form.employee_ids.length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      {form.employee_ids.length} medewerker{form.employee_ids.length !== 1 ? "s" : ""} geselecteerd
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? "Opslaan..." : "Opslaan"}
              </button>
              <button
                onClick={closeForm}
                className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Config list */}
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
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">{config.name}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      config.scope === "group"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {config.scope === "group" ? "Groep" : "Individueel"}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {typeLabels[config.type]} • {periodLabels[config.period] || config.period}
                  {config.target_amount &&
                    ` • Target: ${formatCurrency(config.target_amount)}`}
                  {config.type === "fixed" &&
                    config.bonus_value &&
                    ` • Bonus: ${formatCurrency(config.bonus_value)}`}
                  {config.type === "percentage" &&
                    config.percentage_value &&
                    ` • ${config.percentage_value}%`}
                  {config.type === "tiered" &&
                    config.tiers &&
                    ` • ${config.tiers.length} staffels`}
                  {config.apply_to_all
                    ? " • Alle medewerkers"
                    : ` • ${(config as unknown as { bonus_assignments?: unknown[] }).bonus_assignments?.length || 0} medewerkers`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleActive(config)}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    config.is_active
                      ? "bg-green-50 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {config.is_active ? "Actief" : "Inactief"}
                </button>
                <button
                  onClick={() => openEditForm(config as BonusConfig & { bonus_assignments?: { employee_id: string }[] })}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(config.id)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                >
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
