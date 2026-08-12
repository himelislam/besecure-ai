import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import OWASPStats from "../../components/owasp/OWASPStats";
import OWASPOverview from "../../components/owasp/OWASPOverview";
import OWASPTable from "../../components/owasp/OWASPTable";
import { getVulnerabilities, getVulnerabilityStats } from "../../services/vulnerabilityService";
import { getApiError } from "../../lib/apiResponse";

export default function OWASP() {
  const [stats, setStats] = useState(null);
  // Used only to approximate per-category "affected websites" and
  // "highest severity present" — GET /api/vulnerabilities/stats gives exact
  // per-category finding counts but no severity/website breakdown, so this
  // is the cheapest additional call that covers both. Capped at the API's
  // max page size (50), so these two derived numbers can undercount for
  // accounts with more vulnerabilities than that; the finding counts shown
  // (from stats, not this) are always exact regardless.
  const [sampleVulnerabilities, setSampleVulnerabilities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    setIsLoading(true);
    setLoadError("");

    Promise.all([getVulnerabilityStats(), getVulnerabilities({ limit: 50 })])
      .then(([statsData, vulnData]) => {
        setStats(statsData);
        setSampleVulnerabilities(vulnData.vulnerabilities);
      })
      .catch((err) => setLoadError(getApiError(err).message))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <>
      <PageMeta
        title="OWASP Top 10 | SecureSphere"
        description="OWASP Top 10 Dashboard"
      />

      <div className="space-y-6">

        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            OWASP Top 10
          </h1>

          <p className="mt-1 text-gray-500">
            Review vulnerabilities categorized according to OWASP Top 10.
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500/30 border-t-brand-500" />
          </div>
        )}

        {!isLoading && loadError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
            {loadError}
          </div>
        )}

        {!isLoading && !loadError && stats && (
          <>
            <OWASPStats stats={stats} sampleVulnerabilities={sampleVulnerabilities} />

            <OWASPOverview stats={stats} />

            <OWASPTable stats={stats} sampleVulnerabilities={sampleVulnerabilities} />
          </>
        )}

      </div>
    </>
  );
}
