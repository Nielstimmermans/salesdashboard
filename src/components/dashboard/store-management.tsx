"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, RefreshCw, Trash2, CheckCircle, AlertCircle, ExternalLink, Webhook } from "lucide-react";
import type { Store } from "@/types";

export function StoreManagement() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [shopDomain, setShopDomain] = useState("");
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const success = searchParams.get("success");
  const error = searchParams.get("error");
  const connectedShop = searchParams.get("shop");

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const res = await fetch("/api/stores");
      const data = await res.json();
      setStores(data.stores || []);
    } catch {
      console.error("Failed to fetch stores");
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = () => {
    let domain = shopDomain.trim().toLowerCase();
    if (!domain.includes(".myshopify.com")) {
      domain = `${domain}.myshopify.com`;
    }
    window.location.href = `/api/auth/install?shop=${encodeURIComponent(domain)}`;
  };

  const handleSync = async (storeId: string) => {
    setSyncing(storeId);
    setSyncResult(null);
    try {
      const res = await fetch("/api/shopify/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.results) {
        const summaries = data.results.map((r: any) =>
          r.status === "success"
            ? `${r.store}: ${r.synced} gesynchroniseerd, ${r.skipped} overgeslagen (${r.total} totaal)`
            : `${r.store}: Fout — ${r.error}`
        );
        setSyncResult(summaries.join("\n"));
      } else if (data.error) {
        setSyncResult(`Fout: ${data.error}`);
      }
      await fetchStores();
    } catch {
      setSyncResult("Sync mislukt — netwerk fout");
    } finally {
      setSyncing(null);
    }
  };

  const handleRegisterWebhooks = async (storeId: string) => {
    setSyncing(storeId);
    setSyncResult(null);
    try {
      const res = await fetch("/api/shopify/webhooks/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncResult(`Webhooks geregistreerd voor ${data.store}`);
      } else {
        setSyncResult(`Webhook fouten: ${data.errors?.join(", ") || "onbekend"}`);
      }
    } catch {
      setSyncResult("Webhook registratie mislukt — netwerk fout");
    } finally {
      setSyncing(null);
    }
  };

  const handleDelete = async (storeId: string) => {
    if (!confirm("Weet je zeker dat je deze store wilt verwijderen?")) return;
    try {
      await fetch(`/api/stores?id=${storeId}`, { method: "DELETE" });
      await fetchStores();
    } catch {
      console.error("Delete failed");
    }
  };

  const errorMessages: Record<string, string> = {
    missing_params: "Ontbrekende parameters van Shopify.",
    invalid_shop: "Ongeldig Shopify domein.",
    invalid_nonce: "Sessie verlopen. Probeer opnieuw.",
    invalid_hmac: "Ongeldige handtekening van Shopify.",
    server_config: "Server configuratie fout. Check de environment variabelen.",
    token_exchange_failed: "Kon geen toegangstoken ophalen van Shopify.",
    no_token: "Geen toegangstoken ontvangen.",
    db_save_failed: "Kon store niet opslaan in de database.",
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
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Store toevoegen
        </button>
      </div>

      {/* Success message */}
      {success === "store_connected" && (
        <div className="mx-4 mt-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          <CheckCircle className="h-4 w-4" />
          <span>
            Store <strong>{connectedShop}</strong> is succesvol gekoppeld!
          </span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mx-4 mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          <span>{errorMessages[error] || `Fout: ${error}`}</span>
        </div>
      )}

      {/* Sync result */}
      {syncResult && (
        <div className="mx-4 mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700 whitespace-pre-line">
          {syncResult}
        </div>
      )}

      {/* Add store form */}
      {showAddForm && (
        <div className="border-b p-4">
          <div className="max-w-md space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Shopify domein
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value)}
                placeholder="mijnwinkel.myshopify.com"
                className="flex-1 rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                onKeyDown={(e) => e.key === "Enter" && handleInstall()}
              />
              <button
                onClick={handleInstall}
                disabled={!shopDomain.trim()}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                <ExternalLink className="h-4 w-4" />
                Koppelen
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Je wordt doorgestuurd naar Shopify om de app te installeren.
            </p>
          </div>
        </div>
      )}

      {/* Store list */}
      <div className="divide-y">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Laden...</div>
        ) : stores.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            Nog geen stores gekoppeld. Voeg je eerste Shopify store toe.
          </div>
        ) : (
          stores.map((store) => (
            <div key={store.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-gray-900">{store.name}</p>
                <p className="text-sm text-gray-500">{store.shopify_domain}</p>
                <span className="text-xs text-gray-400">
                  Laatste sync:{" "}
                  {store.last_synced_at
                    ? new Date(store.last_synced_at).toLocaleString("nl-NL")
                    : "Nog niet gesynchroniseerd"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRegisterWebhooks(store.id)}
                  disabled={syncing === store.id}
                  className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  title="Webhooks registreren bij Shopify"
                >
                  <Webhook className="h-3.5 w-3.5" />
                  Webhooks
                </button>
                <button
                  onClick={() => handleSync(store.id)}
                  disabled={syncing === store.id}
                  className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${syncing === store.id ? "animate-spin" : ""}`}
                  />
                  Sync
                </button>
                <button
                  onClick={() => handleDelete(store.id)}
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
