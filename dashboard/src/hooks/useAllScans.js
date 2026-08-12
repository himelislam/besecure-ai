import { useCallback, useEffect, useState } from "react";
import { getWebsites } from "../services/websiteService";
import { getWebsiteScans } from "../services/scanService";
import { getApiError } from "../lib/apiResponse";

// There's no "all scans for this user" endpoint — only GET
// /api/websites/:websiteId/scans (per-site). This fetches the user's
// websites, then each one's scans in parallel, and merges them newest-first.
// Used by both /scans and /scan-history, which are otherwise near-duplicate
// "scan history" views.
export function useAllScans() {
  const [websites, setWebsites] = useState([]);
  const [scans, setScans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const { websites: sites } = await getWebsites();
      setWebsites(sites);

      const perSite = await Promise.all(
        sites.map((site) =>
          getWebsiteScans(site._id, { limit: 50 }).then((data) => data.scans)
        )
      );

      const merged = perSite
        .flat()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setScans(merged);
    } catch (err) {
      setError(getApiError(err).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { websites, scans, isLoading, error, refetch: load };
}
