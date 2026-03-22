"use client";

import { StoreManagement } from "@/components/dashboard/store-management";
import { EmployeeManagement } from "@/components/dashboard/employee-management";

export default function SettingsPage() {
  // TODO: Protect with admin role check — redirect non-admins

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
