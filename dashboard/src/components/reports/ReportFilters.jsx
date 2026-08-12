import { FiFilter, FiSearch, FiX } from "react-icons/fi";

// GET /api/reports has no status/website filter param — only page/limit —
// so all of this filters client-side over the currently-loaded page.
export default function ReportFilters({ filters, onChange, onClear, websites }) {
  const hasFilters = filters.search || filters.status !== "All" || filters.websiteId !== "All";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-5 flex items-center gap-2">
        <FiFilter className="h-5 w-5 text-gray-500" />

        <h2 className="font-semibold text-gray-800 dark:text-white/90">
          Filter Reports
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

          <input
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Search website..."
            className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </div>

        <select
          value={filters.websiteId}
          onChange={(e) => onChange({ websiteId: e.target.value })}
          className="h-11 rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-700 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
        >
          <option value="All">All Websites</option>
          {websites.map((website) => (
            <option key={website._id} value={website._id}>
              {website.nickname}
            </option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) => onChange({ status: e.target.value })}
          className="h-11 rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-700 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
        >
          <option value="All">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="generating">Generating</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {hasFilters && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClear}
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
