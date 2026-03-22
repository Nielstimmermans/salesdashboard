"use client";

import { useRole } from "@/hooks/use-role";
import { redirect } from "next/navigation";
import { StoreManagement } from "@/components/dashboard/store-management";
import { EmployeeManagement } from "@/components/dashboard/employee-management";

export default function SettingsPage() {
  const { isAdmin, loading } = useRole();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-400">Laden...</p>
      </div>
    );
  }

  if (!isAdmin) {
    redirect("/");
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Instellingen</h2>
        <p className="text-sm text-gray-500">
          Beheer stores en medewerkers
        </p>
      </div>

      <StoreManagement />
      <EmployeeManagement />
    </div>
  );
}
