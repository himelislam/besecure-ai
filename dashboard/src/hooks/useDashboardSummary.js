import { useCallback, useEffect, useState } from "react";
import { getDashboardSummary } from "../services/dashboardService";
import { getApiError } from "../lib/apiResponse";

export function useDashboardSummary() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const summary = await getDashboardSummary();
      setData(summary);
    } catch (err) {
      setError(getApiError(err).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, isLoading, error, refetch: load };
}
