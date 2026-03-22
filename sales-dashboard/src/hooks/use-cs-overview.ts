import { useState, useEffect, useCallback } from "react";
import type { PeriodFilter, DateRange } from "@/types";
import type { CSOverviewData, CSOverviewTimeSeries } from "@/types/gorgias";

interface UseCSOverviewParams {
  period: PeriodFilter;
  dateRange?: DateRange;
  storeId: string;
  includeTimeSeries?: boolean;
}

interface UseCSOverviewReturn {
  data: CSOverviewData | null;
  timeSeries: CSOverviewTimeSeries[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCSOverview({
  period,
  dateRange,
  storeId,
  includeTimeSeries = true,
}: UseCSOverviewParams): UseCSOverviewReturn {
  const [data, setData] = useState<CSOverviewData | null>(null);
  const [timeSeries, setTimeSeries] = useState<CSOverviewTimeSeries[]>([]);
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
      const res = await fetch(`/api/cs/overview?${params}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to fetch");
      }
      const json = await res.json();
      setData(json.overview);
      setTimeSeries(json.timeSeries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [period, dateRange, storeId, includeTimeSeries]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, timeSeries, loading, error, refetch: fetchData };
}
