import { useState, useEffect, useCallback } from "react";
import type { PeriodFilter, DateRange } from "@/types";
import type { CSOverviewData, CSOverviewTimeSeries } from "@/types/gorgias";
import type { ViewTicketCount } from "@/lib/gorgias";

interface UseCSOverviewParams {
  period: PeriodFilter;
  dateRange?: DateRange;
  includeTimeSeries?: boolean;
}

interface UseCSOverviewReturn {
  data: CSOverviewData | null;
  timeSeries: CSOverviewTimeSeries[];
  viewCounts: ViewTicketCount[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCSOverview({
  period,
  dateRange,
  includeTimeSeries = true,
}: UseCSOverviewParams): UseCSOverviewReturn {
  const [data, setData] = useState<CSOverviewData | null>(null);
  const [timeSeries, setTimeSeries] = useState<CSOverviewTimeSeries[]>([]);
  const [viewCounts, setViewCounts] = useState<ViewTicketCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      period,
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
      setViewCounts(json.viewCounts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [period, dateRange, includeTimeSeries]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, timeSeries, viewCounts, loading, error, refetch: fetchData };
}
