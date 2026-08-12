import { useState } from "react";
import { FiCalendar, FiFilter, FiSearch, FiX } from "react-icons/fi";

export default function ScanHistoryFilters() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [scanType, setScanType] = useState("All");
  const [dateRange, setDateRange] = useState("All");

  const clearFilters = () => {
    setSearch("");
    setStatus("All");
    setScanType("All");
    setDateRange("All");
  };

  const hasFilters =
    search ||
    status !== "All" ||
    scanType !== "All" ||
    dateRange !== "All";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-5 flex items-center gap-2">
        <FiFilter className="h-5 w-5 text-gray-500" />

        <h2 className="font-semibold text-gray-800 dark:text-white/90">
          Filter Scans
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search website..."
            className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </div>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-11 rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-700 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
        >
          <option value="All">All Statuses</option>
          <option value="Completed">Completed</option>
          <option value="Running">Running</option>
          <option value="Failed">Failed</option>
        </select>

        <select
          value={scanType}
          onChange={(e) => setScanType(e.target.value)}
          className="h-11 rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-700 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
        >
          <option value="All">All Scan Types</option>
          <option value="Full Scan">Full Scan</option>
          <option value="Quick Scan">Quick Scan</option>
          <option value="XSS">XSS</option>
          <option value="SQL Injection">SQL Injection</option>
          <option value="Security Headers">Security Headers</option>
          <option value="SSL">SSL</option>
        </select>

        <div className="relative">
          <FiCalendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-700 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            <option value="All">All Time</option>
            <option value="Today">Today</option>
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
          </select>
        </div>
      </div>

      {hasFilters && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <FiX />
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}