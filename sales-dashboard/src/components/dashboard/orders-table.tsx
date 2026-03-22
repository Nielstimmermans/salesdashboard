"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import type { Order, PeriodFilter, DateRange } from "@/types";

interface OrdersTableProps {
  period: PeriodFilter;
  dateRange?: DateRange;
  storeId: string;
  tag: string;
}

export function OrdersTable({ period, dateRange, storeId, tag }: OrdersTableProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    // TODO: Fetch from /api/orders with filters and pagination
    setOrders([]);
    setLoading(false);
  }, [period, dateRange, storeId, tag, page]);

  const handleExport = async () => {
    // TODO: Call /api/orders/export and download CSV
  };

  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Order overzicht
        </h3>
        <button
          onClick={handleExport}
          className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          Exporteer CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-gray-500">
              <th className="px-4 py-3 font-medium">Ordernummer</th>
              <th className="px-4 py-3 font-medium">Store</th>
              <th className="px-4 py-3 font-medium">Datum</th>
              <th className="px-4 py-3 font-medium">Klant</th>
              <th className="px-4 py-3 font-medium">Medewerker</th>
              <th className="px-4 py-3 font-medium text-right">Betaald</th>
              <th className="px-4 py-3 font-medium text-right">Refund</th>
              <th className="px-4 py-3 font-medium text-right">Netto</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  Laden...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  Geen orders gevonden
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <a
                      href={`https://${order.store?.shopify_domain}/admin/orders/${order.shopify_order_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary hover:underline"
                    >
                      {order.order_number}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {order.store?.name || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(order.order_date).toLocaleDateString("nl-NL")}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {order.customer_name || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                      {order.tag}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCurrency(order.total_paid)}
                  </td>
                  <td className="px-4 py-3 text-right text-red-600">
                    {order.refund_amount > 0
                      ? `-${formatCurrency(order.refund_amount)}`
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {formatCurrency(order.net_amount)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                      {order.financial_status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t px-4 py-3">
        <p className="text-sm text-gray-500">
          Pagina {page} — {pageSize} orders per pagina
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Vorige
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={orders.length < pageSize}
            className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Volgende
          </button>
        </div>
      </div>
    </div>
  );
}
