import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  FiArrowLeft,
  FiShield,
  FiAlertTriangle,
  FiPlay,
  FiCheckCircle,
  FiInfo,
  FiGlobe,
  FiExternalLink,
  FiZap,
  FiLock,
} from "react-icons/fi";
import PageMeta from "../../components/common/PageMeta";
import { useAuth } from "../../hooks/useAuth";
import { getWebsite } from "../../services/websiteService";
import { createScan } from "../../services/scanService";
import { ErrorCodes, getApiError } from "../../lib/apiResponse";

export default function SecurityScan() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isPremium } = useAuth();

  const [website, setWebsite] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [scanType, setScanType] = useState("baseline");
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState("");

  useEffect(() => {
    let cancelled = false;

    getWebsite(id)
      .then(({ website: fetched }) => {
        if (!cancelled) setWebsite(fetched);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(getApiError(err).message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const deepAvailable = Boolean(website?.verified) && isPremium;

  const handleStartScan = async () => {
    setStartError("");
    setIsStarting(true);

    try {
      const { scanId } = await createScan({ websiteId: id, type: scanType });
      navigate(`/websites/${id}/scan/results?scanId=${scanId}`);
    } catch (err) {
      const apiError = getApiError(err);

      if (apiError.code === ErrorCodes.DOMAIN_NOT_VERIFIED) {
        setStartError("Verify domain ownership before running deep scans. Baseline scans don't need verification.");
      } else if (apiError.code === ErrorCodes.PLAN_LIMIT_REACHED) {
        setStartError("Deep scans require a premium subscription. Upgrade to unlock them.");
      } else if (apiError.code === ErrorCodes.RATE_LIMITED && apiError.message.includes("Daily scan limit")) {
        // Scoped to THIS website only — a free-tier cap per site, not a
        // global per-user cap, so this shouldn't disable scanning elsewhere.
        setStartError("This website has hit its daily scan limit (free tier). Try again tomorrow, or scan a different site.");
      } else {
        setStartError(apiError.message);
      }
    } finally {
      setIsStarting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500/30 border-t-brand-500" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <FiAlertTriangle className="text-3xl text-red-400" />
        <p className="text-sm text-gray-600 dark:text-gray-300">{loadError}</p>
        <Link
          to="/websites"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Back to Websites
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title={`Security Scan | ${website.nickname}`}
        description="Run a security scan for your website"
      />

      <div className="space-y-6">
        {/* ================= HEADER ================= */}
        <div>
          <Link
            to={`/websites/${id}`}
            className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-brand-500"
          >
            <FiArrowLeft />
            Back to Website
          </Link>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
                <FiShield className="text-xl" />
              </div>

              <div>
                <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
                  Security Scan
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                  Analyze the security posture of your website.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 dark:border-gray-700 dark:bg-white/[0.03]">
              <FiGlobe className="text-brand-500" />

              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {website.domain}
              </span>
            </div>
          </div>
        </div>

        {/* ================= WEBSITE CARD ================= */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                <FiGlobe className="text-xl" />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Scanning Website
                </p>

                <h2 className="mt-1 text-lg font-semibold text-gray-800 dark:text-white/90">
                  {website.nickname}
                </h2>

                <a
                  href={website.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-500"
                >
                  {website.url}
                  <FiExternalLink className="text-xs" />
                </a>
              </div>
            </div>

            <div
              className={`rounded-xl px-4 py-3 ${
                website.verified ? "bg-green-50 dark:bg-green-500/10" : "bg-yellow-50 dark:bg-yellow-500/10"
              }`}
            >
              <div className="flex items-center gap-2">
                {website.verified ? (
                  <>
                    <FiCheckCircle className="text-green-600" />
                    <span className="text-sm font-medium text-green-700">Domain Verified</span>
                  </>
                ) : (
                  <>
                    <FiAlertTriangle className="text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-700">Not Verified</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ================= MAIN CONTENT ================= */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Scan Type */}
          <div className="xl:col-span-2">
            <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="border-b border-gray-100 p-5 dark:border-gray-800 sm:p-6">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  Choose Scan Type
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  A baseline scan checks headers and SSL/TLS configuration. A
                  deep scan additionally runs active vulnerability checks
                  (ZAP, Nuclei, testssl.sh).
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-6">
                <button
                  type="button"
                  onClick={() => setScanType("baseline")}
                  className={`flex items-start gap-4 rounded-xl border p-4 text-left transition ${
                    scanType === "baseline"
                      ? "border-brand-300 bg-brand-50/50 dark:border-brand-500/40 dark:bg-brand-500/5"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-500 dark:bg-brand-500/10">
                    <FiShield />
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-800 dark:text-white/90">
                      Baseline Scan
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      Headers + SSL/TLS. Available on every plan, no
                      verification required.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setScanType("deep")}
                  className={`relative flex items-start gap-4 rounded-xl border p-4 text-left transition ${
                    scanType === "deep"
                      ? "border-brand-300 bg-brand-50/50 dark:border-brand-500/40 dark:bg-brand-500/5"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-500 dark:bg-purple-500/10">
                    <FiZap />
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-800 dark:text-white/90">
                      Deep Scan
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      {deepAvailable
                        ? "Active vulnerability scan, CVE and TLS checks."
                        : !website.verified
                          ? "Requires domain verification."
                          : "Requires a premium subscription."}
                    </p>
                  </div>

                  {!deepAvailable && (
                    <FiLock className="absolute right-4 top-4 text-gray-400" />
                  )}
                </button>
              </div>

              {/* Error */}
              {startError && (
                <div className="mx-5 mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 sm:mx-6">
                  {startError}
                </div>
              )}

              {/* Footer */}
              <div className="border-t border-gray-100 p-5 dark:border-gray-800 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {scanType === "deep" ? "Deep scan selected" : "Baseline scan selected"}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Findings appear live as the scan runs.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isStarting || (scanType === "deep" && !deepAvailable)}
                    onClick={handleStartScan}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-6 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FiPlay />
                    {isStarting ? "Starting..." : "Start Security Scan"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ================= SIDEBAR ================= */}
          <div className="space-y-6">
            {/* What will happen */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h3 className="font-semibold text-gray-800 dark:text-white/90">
                What happens during a scan?
              </h3>

              <div className="mt-5 space-y-4">
                {[
                  "The scan is queued and picked up by a worker.",
                  "Progress updates arrive live as each check runs.",
                  "Findings are categorized by severity.",
                  "Results are mapped to OWASP Top 10.",
                  "Your website's security score is recalculated.",
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-500 dark:bg-brand-500/10">
                      {index + 1}
                    </div>

                    <p className="text-sm leading-6 text-gray-500">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Authorization */}
            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 dark:border-yellow-500/20 dark:bg-yellow-500/5">
              <div className="flex items-start gap-3">
                <FiInfo className="mt-0.5 shrink-0 text-yellow-600" />

                <div>
                  <h3 className="font-medium text-yellow-800">
                    Important
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-yellow-700">
                    Only scan websites that you own or have explicit
                    permission to test. Unauthorized security testing may
                    violate laws or service agreements.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
