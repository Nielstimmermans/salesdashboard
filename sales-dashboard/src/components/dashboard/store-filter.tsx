"use client";

import { useEffect, useState } from "react";
import type { Store } from "@/types";

interface StoreFilterProps {
  value: string;
  onChange: (storeId: string) => void;
}

export function StoreFilter({ value, onChange }: StoreFilterProps) {
  const [stores, setStores] = useState<Store[]>([]);

  useEffect(() => {
    // TODO: Fetch stores from /api/stores
    setStores([]);
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
