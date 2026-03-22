import { useState, useEffect, useCallback } from "react";
import type { PeriodFilter, DateRange } from "@/types";
import type { ChannelDistributionData } from "@/types/gorgias";

interface UseChannelDistributionParams {
  period: PeriodFilter;
  dateRange?: DateRange;
  storeId: string;
  includeTimeSeries?: boolean;
}

interface UseChannelDistributionReturn {
  data: ChannelDistributionData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useChannelDistribution({
  period,
  dateRange,
  storeId,
  includeTimeSeries = true,
}: UseChannelDistributionParams): UseChannelDistributionReturn {
  const [data, setData] = useState<ChannelDistributionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      period,
      store_id: storeId,
      time_series: includeTimeSeries ? "true" : "false",
    });

    if (period === "custom" && dateRange) {
      params.set("from", dateRange.from.toISOString());
      params.set("to", dateRange.to.toISOString());
    }

    try {
      const res = await fetch(`/api/cs/channels?${params}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to fetch");
      }
      const json = await res.json();
      setData(json.distribution);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [period, dateRange, storeId, includeTimeSeries]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
