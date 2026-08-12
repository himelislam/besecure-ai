import { useEffect, useState } from "react";
import { FiPlus, FiRefreshCw } from "react-icons/fi";
import PageMeta from "../../components/common/PageMeta";
import { Modal } from "../../components/ui/modal";
import { useModal } from "../../hooks/useModal";
import ReportStats from "../../components/reports/ReportStats";
import ReportFilters from "../../components/reports/ReportFilters";
import ReportTable from "../../components/reports/ReportTable";
import { getReports } from "../../services/reportService";
import { getWebsites } from "../../services/websiteService";
import { useAllScans } from "../../hooks/useAllScans";
import { useReportForScan } from "../../hooks/useReportForScan";
import { getApiError } from "../../lib/apiResponse";

const DEFAULT_FILTERS = { search: "", status: "All", websiteId: "All" };

export default function Reports() {
  const [websites, setWebsites] = useState([]);
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const generateModal = useModal();

  useEffect(() => {
    getWebsites()
      .then((data) => setWebsites(data.websites))
      .catch(() => {
        // Non-critical — the website filter/column just falls back to "—".
      });
  }, []);

  const loadReports = () => {
    setIsLoading(true);
    setLoadError("");

    getReports({ page, limit: 20 })
      .then((data) => {
        setReports(data.reports);
        setTotal(data.total);
        setPages(data.pages);
      })
      .catch((err) => setLoadError(getApiError(err).message))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const updateFilters = (patch) => setFilters((prev) => ({ ...prev, ...patch }));
  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  const visibleReports = reports.filter((report) => {
    const website = websites.find((w) => w._id === report.websiteId);
    const label = `${website?.nickname || ""} ${website?.domain || ""}`.toLowerCase();

    const matchesSearch = !filters.search || label.includes(filters.search.toLowerCase());
    const matchesStatus = filters.status === "All" || report.status === filters.status;
    const matchesWebsite = filters.websiteId === "All" || report.websiteId === filters.websiteId;

    return matchesSearch && matchesStatus && matchesWebsite;
  });

  const handleGenerated = () => {
    generateModal.closeModal();
    loadReports();
  };

  return (
    <>
      <PageMeta
        title="Security Reports | SecureSphere"
        description="View, generate and download website security reports."
      />

      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              Security Reports
            </h1>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Generate and download PDF security audit reports for your scans.
            </p>
          </div>

          <button
            type="button"
            onClick={generateModal.openModal}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            <FiPlus />
            Generate Report
          </button>
        </div>

        <ReportStats reports={reports} total={total} />

        <ReportFilters filters={filters} onChange={updateFilters} onClear={clearFilters} websites={websites} />

        {loadError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
            {loadError}
          </div>
        )}

        <ReportTable
          reports={visibleReports}
          websites={websites}
          total={total}
          page={page}
          pages={pages}
          isLoading={isLoading}
          onPageChange={setPage}
        />
      </div>

      <GenerateReportModal isOpen={generateModal.isOpen} onClose={generateModal.closeModal} onGenerated={handleGenerated} />
    </>
  );
}

function GenerateReportModal({ isOpen, onClose, onGenerated }) {
  const { scans, isLoading: isLoadingScans } = useAllScans();
  const completedScans = scans.filter((s) => s.status === "completed");

  const [scanId, setScanId] = useState("");
  const reportState = useReportForScan(scanId);
  const { report, isStarting, error, limitMessage, generate } = reportState;

  useEffect(() => {
    if (isOpen && !scanId && completedScans.length > 0) {
      setScanId(completedScans[0]._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, completedScans.length]);

  useEffect(() => {
    if (report?.status === "completed") {
      onGenerated();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.status]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md m-4">
      <div className="p-6">
        <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
          Generate a report
        </h3>

        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          Pick a completed scan to generate a PDF security report for.
        </p>

        {isLoadingScans ? (
          <p className="text-sm text-gray-500">Loading your scans...</p>
        ) : completedScans.length === 0 ? (
          <p className="text-sm text-gray-500">No completed scans yet — run a scan first.</p>
        ) : (
          <select
            value={scanId}
            onChange={(e) => setScanId(e.target.value)}
            disabled={isStarting || report?.status === "generating"}
            className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-700 outline-none focus:border-brand-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            {completedScans.map((scan) => (
              <option key={scan._id} value={scan._id}>
                {scan.targetUrl} — {new Date(scan.createdAt).toLocaleDateString()}
              </option>
            ))}
          </select>
        )}

        {limitMessage && <p className="mt-4 text-sm text-amber-600">{limitMessage}</p>}
        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

        {/* No "completed" branch here — the effect above closes this modal
            and refreshes the table the instant status flips to completed,
            so a completed report is never actually rendered while this
            modal is open. The table row's own download button is the only
            place a completed report is shown, same as scans/roadmap surface
            their completions on the underlying page rather than in the
            triggering dialog. */}

        {report?.status === "failed" && (
          <p className="mt-4 text-sm text-red-600">Generation failed. You can retry below.</p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Close
          </button>

          <button
            type="button"
            onClick={generate}
            disabled={!scanId || isStarting || report?.status === "generating"}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isStarting || report?.status === "generating" ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Generating...
              </>
            ) : report?.status === "failed" ? (
              <>
                <FiRefreshCw />
                Retry
              </>
            ) : (
              "Generate"
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
