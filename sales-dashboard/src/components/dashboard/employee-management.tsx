"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, UserX } from "lucide-react";
import type { Employee } from "@/types";

export function EmployeeManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch from /api/employees
    setEmployees([]);
    setLoading(false);
  }, []);

  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Medewerkers</h3>
          <p className="text-sm text-gray-500">
            Beheer medewerkers en hun Shopify tags
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Medewerker toevoegen
        </button>
      </div>

      {/* TODO: Employee form modal met velden:
          - Naam
          - Shopify tag (lowercase, geen spaties)
          - Clerk User ID (koppelen aan Clerk account)
          - Rol (admin/employee)
      */}

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
              className="flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {emp.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
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
                <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
                  <Pencil className="h-4 w-4" />
                </button>
                <button className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600">
                  <UserX className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
