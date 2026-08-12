import PageMeta from "../../components/common/PageMeta";

import SecurityMetrics from "../../components/security/SecurityMetrics";
import SecurityScoreChart from "../../components/security/SecurityScoreChart";
import RiskDistribution from "../../components/security/RiskDistribution";
import RecentScans from "../../components/security/RecentScans";
import WebsiteSummaryList from "../../components/security/WebsiteSummaryList";
import CriticalVulnerabilities from "../../components/security/CriticalVulnerabilities";
import QuickActions from "../../components/security/QuickActions";

import { FiAlertTriangle, FiArrowRight, FiPlus, FiShield } from "react-icons/fi";
import { Link } from "react-router";
import { useAuth } from "../../hooks/useAuth";
import { useDashboardSummary } from "../../hooks/useDashboardSummary";

export default function Home() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useDashboardSummary();

  return (
    <>
      <PageMeta
        title="SecureSphere | Security Overview"
        description="Monitor and improve your website security posture with SecureSphere."
      />

      <div className="space-y-6">
        {/* =================================================
            PAGE HEADER
        ================================================== */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50">
                <FiShield className="h-5 w-5 text-cyan-600" />
              </div>

              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-600">
                Security Overview
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
              Welcome back{user?.name ? `, ${user.name}` : ""}
            </h1>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Monitor your websites and improve your overall security posture.
            </p>
          </div>

          <Link
            to="/scans"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-600"
          >
            Start Security Scan
            <FiArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-500" />
          </div>
        )}

        {!isLoading && error && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 py-16 text-center dark:border-red-500/20 dark:bg-red-500/5">
            <FiAlertTriangle className="text-3xl text-red-400" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              type="button"
              onClick={refetch}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 dark:border-red-500/30 dark:hover:bg-red-500/10"
            >
              Try again
            </button>
          </div>
        )}

        {!isLoading && !error && data && (
          <>
            {data.totalWebsites === 0 && (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 py-12 text-center dark:border-cyan-500/20 dark:bg-cyan-500/5">
                <FiShield className="text-3xl text-cyan-500" />
                <div>
                  <h2 className="font-semibold text-gray-800 dark:text-white">
                    Add your first website to get started
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Once you add a website you can run scans and track its security score here.
                  </p>
                </div>
                <Link
                  to="/websites/add"
                  className="mt-2 inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-600"
                >
                  <FiPlus />
                  Add Website
                </Link>
              </div>
            )}

            {/* =================================================
                SECURITY METRICS
            ================================================== */}

            <SecurityMetrics summary={data} />

            {/* =================================================
                CHARTS
            ================================================== */}

            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 xl:col-span-8">
                <SecurityScoreChart scoreHistory={data.scoreHistory} />
              </div>

              <div className="col-span-12 xl:col-span-4">
                <RiskDistribution riskDistribution={data.riskDistribution} />
              </div>
            </div>

            {/* =================================================
                RECENT SCANS + WEBSITES
            ================================================== */}

            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 xl:col-span-7">
                <RecentScans scans={data.recentScans} />
              </div>

              <div className="col-span-12 xl:col-span-5">
                <WebsiteSummaryList websites={data.websitesSummary} />
              </div>
            </div>

            {/* =================================================
                VULNERABILITIES + QUICK ACTIONS
            ================================================== */}

            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 xl:col-span-7">
                <CriticalVulnerabilities websites={data.websitesSummary} />
              </div>

              <div className="col-span-12 xl:col-span-5">
                <QuickActions />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
