import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import VulnerabilityStats from "../../components/vulnerabilities/VulnerabilityStats";
import VulnerabilityFilters from "../../components/vulnerabilities/VulnerabilityFilters";
import VulnerabilityTable from "../../components/vulnerabilities/VulnerabilityTable";
import { getVulnerabilities, getVulnerabilityStats } from "../../services/vulnerabilityService";
import { getWebsites } from "../../services/websiteService";
import { getApiError } from "../../lib/apiResponse";
import { sortBySeverity, isValidObjectId } from "../../lib/vulnerabilityRules";

const DEFAULT_FILTERS = {
  search: "",
  severity: "",
  status: "",
  websiteId: "",
  sortBy: "createdAt",
  sortOrder: "desc",
};

export default function Vulnerabilities() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);

  const [websites, setWebsites] = useState([]);

  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [stats, setStats] = useState(null);

  useEffect(() => {
    getWebsites()
      .then((data) => setWebsites(data.websites))
      .catch(() => {
        // Non-critical — the website filter dropdown just stays empty.
      });
  }, []);

  useEffect(() => {
    // GET /api/vulnerabilities/stats has a known backend bug where a
    // syntactically-invalid websiteId throws a raw uncaught 500 instead of
    // a clean 400 — never send it unless it's a real ObjectId.
    const websiteIdParam = isValidObjectId(filters.websiteId) ? filters.websiteId : undefined;

    getVulnerabilityStats({ websiteId: websiteIdParam })
      .then(setStats)
      .catch(() => {
        // Non-critical — the stats cards just show placeholders.
      });
  }, [filters.websiteId]);

  useEffect(() => {
    setIsLoading(true);
    setLoadError("");

    getVulnerabilities({
      websiteId: filters.websiteId || undefined,
      status: filters.status || undefined,
      severity: filters.severity || undefined,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      page,
      limit: 20,
    })
      .then((data) => {
        const items = filters.sortBy === "severity" ? sortBySeverity(data.vulnerabilities) : data.vulnerabilities;
        setVulnerabilities(items);
        setTotal(data.total);
        setPages(data.pages);
      })
      .catch((err) => setLoadError(getApiError(err).message))
      .finally(() => setIsLoading(false));
  }, [filters.websiteId, filters.status, filters.severity, filters.sortBy, filters.sortOrder, page]);

  const updateFilters = (patch) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  };

  const visibleVulnerabilities = filters.search
    ? vulnerabilities.filter((v) => v.title.toLowerCase().includes(filters.search.toLowerCase()))
    : vulnerabilities;

  return (
    <>
      <PageMeta
        title="Vulnerabilities | SecureSphere"
        description="Manage and monitor website security vulnerabilities."
      />

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Vulnerabilities
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Review, prioritize and manage security vulnerabilities discovered
            across your websites.
          </p>
        </div>

        <VulnerabilityStats stats={stats} />

        <VulnerabilityFilters
          filters={filters}
          onChange={updateFilters}
          onClear={clearFilters}
          websites={websites}
        />

        {loadError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
            {loadError}
          </div>
        )}

        <VulnerabilityTable
          vulnerabilities={visibleVulnerabilities}
          websites={websites}
          total={total}
          page={page}
          pages={pages}
          isLoading={isLoading}
          onPageChange={setPage}
        />
      </div>
    </>
  );
}
