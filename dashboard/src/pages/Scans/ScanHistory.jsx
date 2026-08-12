import { useMemo, useState } from "react";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import {
  FiSearch,
  FiFilter,
  FiCalendar,
  FiEye,
  FiShield,
  FiAlertTriangle,
  FiCheckCircle,
  FiXCircle,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
  FiDownload,
  FiClock,
} from "react-icons/fi";
import { useAllScans } from "../../hooks/useAllScans";
import { SCAN_STATUS_LABELS } from "../../lib/scanRules";

const statusOptions = ["All", "queued", "running", "completed", "failed"];
const dateOptions = [
  { value: "All", label: "All Dates" },
  { value: "7", label: "Last 7 Days" },
  { value: "30", label: "Last 30 Days" },
  { value: "90", label: "Last 90 Days" },
];

const statusBadge = {
  completed: { icon: FiCheckCircle, className: "bg-green-50 text-green-600" },
  running: { icon: FiRefreshCw, className: "bg-cyan-50 text-cyan-600" },
  queued: { icon: FiClock, className: "bg-gray-100 text-gray-600" },
  failed: { icon: FiXCircle, className: "bg-red-50 text-red-500" },
};

export default function ScanHistory() {
  const { websites, scans, isLoading, error } = useAllScans();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 6;

  const websiteById = useMemo(() => {
    const map = new Map();
    websites.forEach((w) => map.set(w._id, w));
    return map;
  }, [websites]);

  const filteredScans = useMemo(() => {
    const searchValue = search.toLowerCase().trim();
    const cutoff = dateFilter === "All" ? null : Date.now() - Number(dateFilter) * 24 * 60 * 60 * 1000;

    return scans.filter((scan) => {
      const website = websiteById.get(scan.websiteId);
      const label = `${website?.nickname || ""} ${website?.domain || ""} ${scan.targetUrl || ""} ${scan._id}`.toLowerCase();

      const matchesSearch = !searchValue || label.includes(searchValue);
      const matchesStatus = status === "All" || scan.status === status;
      const matchesDate = !cutoff || new Date(scan.createdAt).getTime() >= cutoff;

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [scans, search, status, dateFilter, websiteById]);

  const totalPages = Math.max(1, Math.ceil(filteredScans.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedScans = filteredScans.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  const completedCount = scans.filter((s) => s.status === "completed").length;
  const failedCount = scans.filter((s) => s.status === "failed").length;
  const totalVulnerabilities = scans.reduce((total, scan) => {
    const counts = scan.findingCounts || {};
    return total + Object.values(counts).reduce((sum, v) => sum + v, 0);
  }, 0);

  const resetFilters = () => {
    setSearch("");
    setStatus("All");
    setDateFilter("All");
    setCurrentPage(1);
  };

  const handleSearch = (value) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleStatus = (value) => {
    setStatus(value);
    setCurrentPage(1);
  };

  return (
    <>
      <PageMeta
        title="Scan History | BeSecure AI"
        description="View and manage your previous security scans"
      />

      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              Scan History
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              View previous security scans, results, vulnerabilities, and security scores.
            </p>
          </div>

          <Link
            to="/websites"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            <FiShield />
            Start New Scan
          </Link>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard icon={<FiShield />} label="Total Scans" value={scans.length} iconClass="bg-brand-50 text-brand-500" />
          <SummaryCard icon={<FiCheckCircle />} label="Completed" value={completedCount} iconClass="bg-green-50 text-green-600" />
          <SummaryCard icon={<FiXCircle />} label="Failed" value={failedCount} iconClass="bg-red-50 text-red-500" />
          <SummaryCard icon={<FiAlertTriangle />} label="Vulnerabilities Found" value={totalVulnerabilities} iconClass="bg-orange-50 text-orange-500" />
        </div>

        {/* FILTERS */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-md">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />

              <input
                type="text"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search website, URL or scan ID..."
                className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-11 pr-4 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <FiFilter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

                <select
                  value={status}
                  onChange={(e) => handleStatus(e.target.value)}
                  className="h-11 min-w-[160px] appearance-none rounded-lg border border-gray-200 bg-white pl-10 pr-8 text-sm text-gray-700 outline-none focus:border-brand-300"
                >
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === "All" ? "All Status" : SCAN_STATUS_LABELS[option]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <FiCalendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

                <select
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-11 min-w-[160px] appearance-none rounded-lg border border-gray-200 bg-white pl-10 pr-8 text-sm text-gray-700 outline-none focus:border-brand-300"
                >
                  {dateOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                <FiRefreshCw />
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* SCAN TABLE */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-col gap-2 border-b border-gray-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Previous Scans</h2>
              <p className="mt-1 text-sm text-gray-500">
                {filteredScans.length} scan{filteredScans.length !== 1 ? "s" : ""} found
              </p>
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-2 self-start rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              <FiDownload />
              Export History
            </button>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500/30 border-t-brand-500" />
            </div>
          )}

          {!isLoading && error && (
            <div className="px-6 py-16 text-center text-sm text-red-500">{error}</div>
          )}

          {!isLoading && !error && paginatedScans.length === 0 && (
            <div className="px-6 py-16 text-center text-sm text-gray-500">
              No scans match your filters.
            </div>
          )}

          {!isLoading && !error && paginatedScans.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/70">
                    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Website</th>
                    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Date</th>
                    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
                    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Vulnerabilities</th>
                    <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Score</th>
                    <th className="px-5 py-4 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {paginatedScans.map((scan) => {
                    const website = websiteById.get(scan.websiteId);
                    const counts = scan.findingCounts || {};
                    const totalFindings = Object.values(counts).reduce((sum, v) => sum + v, 0);
                    const Badge = statusBadge[scan.status] || statusBadge.queued;
                    const BadgeIcon = Badge.icon;

                    return (
                      <tr key={scan._id} className="transition hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                        <td className="px-5 py-4">
                          <p className="font-medium text-gray-800 dark:text-white/90">{website?.nickname || "Unknown website"}</p>
                          <p className="mt-0.5 text-xs text-gray-400">{scan.type}</p>
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-500">
                          {new Date(scan.createdAt).toLocaleString()}
                        </td>

                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${Badge.className}`}>
                            <BadgeIcon className={scan.status === "running" ? "animate-spin" : ""} />
                            {SCAN_STATUS_LABELS[scan.status]}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-600">
                          {scan.status === "completed" ? (totalFindings === 0 ? "No issues" : totalFindings) : "—"}
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-gray-700">
                          {scan.score ?? "—"}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Link
                            to={`/websites/${scan.websiteId}/scan/results?scanId=${scan._id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:border-brand-300 hover:text-brand-500"
                          >
                            <FiEye />
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4">
              <p className="text-sm text-gray-500">
                Page {safePage} of {totalPages}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage(safePage - 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FiChevronLeft />
                </button>

                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage(safePage + 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FiChevronRight />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function SummaryCard({ icon, label, value, iconClass }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <h3 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white/90">{value}</h3>
        </div>

        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}>{icon}</div>
      </div>
    </div>
  );
}
