"use client";

import { useEffect, useState } from "react";

interface StoreFilterProps {
  value: string;
  onChange: (storeId: string) => void;
}

interface StoreOption {
  id: string;
  name: string;
}

export function StoreFilter({ value, onChange }: StoreFilterProps) {
  const [stores, setStores] = useState<StoreOption[]>([]);

  useEffect(() => {
    async function fetchStores() {
      try {
        const res = await fetch("/api/stores");
        if (res.ok) {
          const data = await res.json();
          setStores(data.stores || []);
        }
      } catch {
        console.error("Failed to fetch stores");
      }
    }
    fetchStores();
  }, []);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-500">Store:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border bg-white px-3 py-2 text-sm"
      >
        <option value="all">Alle stores</option>
        {stores.map((store) => (
          <option key={store.id} value={store.id}>
            {store.name}
          </option>
        ))}
      </select>
    </div>
  );
}
