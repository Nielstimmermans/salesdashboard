"use client";

import { useEffect, useState } from "react";
import { Plus, RefreshCw, Pencil, Trash2 } from "lucide-react";
import type { Store } from "@/types";

export function StoreManagement() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch from /api/stores
    setStores([]);
    setLoading(false);
  }, []);

  const handleSync = async (storeId: string) => {
    // TODO: POST /api/shopify/sync/[storeId]
  };

  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Stores</h3>
          <p className="text-sm text-gray-500">
            Beheer je Shopify store koppelingen
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Store toevoegen
        </button>
      </div>

      {/* TODO: Store form modal met velden:
          - Store naam
          - Shopify domain (bijv. mystore.myshopify.com)
          - API Key
          - API Secret
          - Access Token
      */}

      <div className="divide-y">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Laden...</div>
        ) : stores.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            Nog geen stores gekoppeld. Voeg je eerste Shopify store toe.
          </div>
        ) : (
          stores.map((store) => (
            <div
              key={store.id}
              className="flex items-center justify-between p-4"
            >
              <div>
                <p className="font-medium text-gray-900">{store.name}</p>
                <p className="text-sm text-gray-500">{store.shopify_domain}</p>
                <p className="text-xs text-gray-400">
                  Laatste sync:{" "}
                  {store.last_synced_at
                    ? new Date(store.last_synced_at).toLocaleString("nl-NL")
                    : "Nog niet gesynchroniseerd"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSync(store.id)}
                  className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Sync
                </button>
                <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
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
