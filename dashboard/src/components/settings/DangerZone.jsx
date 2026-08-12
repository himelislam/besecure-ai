import { FiAlertTriangle, FiDownload, FiTrash2 } from "react-icons/fi";

// No account-deletion or data-export endpoint exists anywhere in
// API_REFERENCE.md's Auth section (register/login/verify-email/forgot-
// password/reset-password/refresh/me/change-password/logout — nothing
// destructive). Previously "Delete Everything" and "Export Data" both just
// console.logged and did nothing, while the copy claimed the delete was
// real and irreversible — the worst kind of fake UI, since a user could
// believe destructive action happened when it didn't. Both are disabled
// with an honest label until real endpoints exist.
export default function DangerZone() {
  return (
    <div className="space-y-6">
      {/* Export */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Export Your Data
              </h2>

              <p className="mt-1 max-w-xl text-sm text-gray-500 dark:text-gray-400">
                Download a copy of your account data, websites, scans,
                reports and security history.
              </p>

              <p className="mt-2 text-xs text-gray-400">
                Not available yet — needs backend work.
              </p>
            </div>

            <button
              type="button"
              disabled
              title="Not available yet — needs backend work"
              className="inline-flex shrink-0 cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-400 dark:border-gray-700 dark:text-gray-600"
            >
              <FiDownload />
              Export Data
            </button>
          </div>
        </div>
      </div>

      {/* Danger */}
      <div className="rounded-2xl border border-red-200 bg-white dark:border-red-500/30 dark:bg-white/[0.03]">
        <div className="border-b border-red-100 bg-red-50/50 px-5 py-5 dark:border-red-500/20 dark:bg-red-500/5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400">
              <FiAlertTriangle />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">
                Danger Zone
              </h2>

              <p className="mt-1 text-sm text-red-600/70 dark:text-red-400/70">
                These actions cannot be easily undone.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div>
            <h3 className="font-medium text-gray-800 dark:text-white/90">
              Delete Account
            </h3>

            <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
              Account deletion isn't available yet — there's no backend endpoint
              for it. If you need your account or data removed, contact support
              directly.
            </p>
          </div>

          <button
            type="button"
            disabled
            title="Not available yet — needs backend work"
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-red-300 px-4 py-2.5 text-sm font-medium text-white dark:bg-red-500/30"
          >
            <FiTrash2 />
            Delete Everything
          </button>
        </div>
      </div>
    </div>
  );
}
