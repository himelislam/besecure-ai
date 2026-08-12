import { Link } from "react-router";
import {
  FiArrowRight,
  FiMessageCircle,
  FiPlus,
  FiSearch,
} from "react-icons/fi";

export default function QuickActions() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Quick Actions
        </h3>

        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Common security tasks.
        </p>
      </div>

      <div className="mt-5 space-y-3">
        <Link
          to="/scans"
          className="group flex items-center gap-3 rounded-xl border border-cyan-100 bg-cyan-50/50 p-3 transition hover:border-cyan-200 hover:bg-cyan-50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500 text-white">
            <FiSearch className="h-5 w-5" />
          </div>

          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">
              Start Security Scan
            </p>

            <p className="text-xs text-gray-500">
              Analyze a website
            </p>
          </div>

          <FiArrowRight className="h-4 w-4 text-gray-400 transition group-hover:translate-x-1" />
        </Link>

        <Link
          to="/websites"
          className="group flex items-center gap-3 rounded-xl border border-gray-100 p-3 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.03]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
            <FiPlus className="h-5 w-5" />
          </div>

          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800 dark:text-white">
              Add Website
            </p>

            <p className="text-xs text-gray-500">
              Add a new security asset
            </p>
          </div>

          <FiArrowRight className="h-4 w-4 text-gray-400 transition group-hover:translate-x-1" />
        </Link>

        <Link
          to="/ai-assistant"
          className="group flex items-center gap-3 rounded-xl border border-gray-100 p-3 transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.03]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
            <FiMessageCircle className="h-5 w-5" />
          </div>

          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800 dark:text-white">
              Ask AI Security Assistant
            </p>

            <p className="text-xs text-gray-500">
              Get security guidance
            </p>
          </div>

          <FiArrowRight className="h-4 w-4 text-gray-400 transition group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}