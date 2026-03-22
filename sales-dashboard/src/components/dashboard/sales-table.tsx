"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { PeriodFilter, DateRange, SalesPerEmployee } from "@/types";

interface SalesTableProps {
  period: PeriodFilter;
  dateRange?: DateRange;
  storeId: string;
}

export function SalesTable({ period, dateRange, storeId }: SalesTableProps) {
  const [data, setData] = useState<SalesPerEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch from /api/stats
    setData([]);
    setLoading(false);
  }, [period, dateRange, storeId]);

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        Sales per medewerker
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-gray-500">
              <th className="pb-3 font-medium">Medewerker</th>
              <th className="pb-3 font-medium text-right">Orders</th>
              <th className="pb-3 font-medium text-right">Omzet</th>
              <th className="pb-3 font-medium text-right">Refunds</th>
              <th className="pb-3 font-medium text-right">Netto</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400">
                  Laden...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400">
                  Geen data beschikbaar
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row.tag} className="border-b last:border-0">
                  <td className="py-3 font-medium text-gray-900">
                    {row.employeeName}
                  </td>
                  <td className="py-3 text-right">{formatNumber(row.orderCount)}</td>
                  <td className="py-3 text-right">
                    {formatCurrency(row.totalRevenue)}
                  </td>
                  <td className="py-3 text-right text-red-600">
                    {formatCurrency(row.totalRefunds)}
                  </td>
                  <td className="py-3 text-right font-semibold">
                    {formatCurrency(row.netRevenue)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
