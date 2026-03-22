"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, UserX, UserCheck, X, Check } from "lucide-react";
import type { Employee } from "@/types";

interface EmployeeForm {
  name: string;
  tag: string;
  clerk_user_id: string;
  role: "admin" | "employee";
}

const emptyForm: EmployeeForm = {
  name: "",
  tag: "",
  clerk_user_id: "",
  role: "employee",
};

export function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employees");
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch {
      console.error("Failed to fetch employees");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.tag.trim()) {
      setError("Naam en tag zijn verplicht");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = editingId ? `/api/employees?id=${editingId}` : "/api/employees";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          tag: form.tag.trim().toLowerCase().replace(/\s+/g, "-"),
          clerk_user_id: form.clerk_user_id.trim() || null,
          role: form.role,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Er ging iets mis");
        return;
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await fetchEmployees();
    } catch {
      setError("Kon niet opslaan");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (emp: Employee) => {
    setForm({
      name: emp.name,
      tag: emp.tag,
      clerk_user_id: emp.clerk_user_id || "",
      role: emp.role,
    });
    setEditingId(emp.id);
    setShowForm(true);
    setError(null);
  };

  const handleToggleActive = async (emp: Employee) => {
    const action = emp.is_active ? "deactiveren" : "activeren";
    if (!confirm(`Weet je zeker dat je ${emp.name} wilt ${action}?`)) return;

    try {
      await fetch(`/api/employees?id=${emp.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !emp.is_active }),
      });
      await fetchEmployees();
    } catch {
      console.error("Toggle failed");
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  };

  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Medewerkers</h3>
          <p className="text-sm text-gray-500">
            Beheer medewerkers en hun Shopify tags
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              setForm(emptyForm);
              setEditingId(null);
              setShowForm(true);
              setError(null);
            }}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Medewerker toevoegen
          </button>
        )}
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="border-b p-4">
          <div className="max-w-lg space-y-3">
            <h4 className="text-sm font-semibold text-gray-900">
              {editingId ? "Medewerker bewerken" : "Nieuwe medewerker"}
            </h4>

            {error && (
              <div className="rounded-lg bg-red-50 p-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Naam
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Jan de Vries"
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Shopify tag
                </label>
                <input
                  type="text"
                  value={form.tag}
                  onChange={(e) => setForm({ ...form, tag: e.target.value })}
                  placeholder="jan"
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="mt-0.5 text-xs text-gray-400">
                  Moet overeenkomen met de tag op Shopify orders
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Clerk User ID
                  <span className="ml-1 font-normal text-gray-400">(optioneel)</span>
                </label>
                <input
                  type="text"
                  value={form.clerk_user_id}
                  onChange={(e) =>
                    setForm({ ...form, clerk_user_id: e.target.value })
                  }
                  placeholder="user_..."
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="mt-0.5 text-xs text-gray-400">
                  Koppel aan een Clerk account voor dashboard toegang
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Rol
                </label>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      role: e.target.value as "admin" | "employee",
                    })
                  }
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="employee">Medewerker</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                {saving
                  ? "Opslaan..."
                  : editingId
                  ? "Wijzigingen opslaan"
                  : "Toevoegen"}
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-1 rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee list */}
      <div className="divide-y">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Laden...</div>
        ) : employees.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            Nog geen medewerkers toegevoegd
          </div>
        ) : (
          employees.map((emp) => (
            <div
              key={emp.id}
              className={`flex items-center justify-between p-4 ${
                !emp.is_active ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {emp.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{emp.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      tag: {emp.tag}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        emp.role === "admin"
                          ? "bg-purple-50 text-purple-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {emp.role}
                    </span>
                    {emp.clerk_user_id && (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                        account gekoppeld
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    emp.is_active
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {emp.is_active ? "Actief" : "Inactief"}
                </span>
                <button
                  onClick={() => handleEdit(emp)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
                  title="Bewerken"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleToggleActive(emp)}
                  className={`rounded-lg p-2 ${
                    emp.is_active
                      ? "text-gray-400 hover:bg-red-50 hover:text-red-600"
                      : "text-gray-400 hover:bg-green-50 hover:text-green-600"
                  }`}
                  title={emp.is_active ? "Deactiveren" : "Activeren"}
                >
                  {emp.is_active ? (
                    <UserX className="h-4 w-4" />
                  ) : (
                    <UserCheck className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
