import PageMeta from "../../components/common/PageMeta";
import ScanHistoryStats from "../../components/scan-history/ScanHistoryStats";
import ScanHistoryFilters from "../../components/scan-history/ScanHistoryFilters";
import ScanHistoryTable from "../../components/scan-history/ScanHistoryTable";

export default function ScanHistory() {
  return (
    <>
      <PageMeta
        title="Scan History | SecureSphere"
        description="View and manage previous website security scans."
      />

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Scan History
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View previous security scans, results, findings and scan status.
          </p>
        </div>

        <ScanHistoryStats />

        <ScanHistoryFilters />

        <ScanHistoryTable />
      </div>
    </>
  );
}