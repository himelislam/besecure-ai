import { FiBell } from "react-icons/fi";

// No backend support exists for notification preferences — same missing
// feature as pages/Notifications/Notifications.jsx (no routes/controllers/
// models mention "notification" anywhere in server/, and it's not in
// API_REFERENCE.md). Previously these toggles updated local state only and
// "Save Preferences" just console.logged it — nothing was ever persisted.
export default function NotificationSettings() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="border-b border-gray-100 px-5 py-5 dark:border-gray-800 sm:px-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Notification Settings
        </h2>

        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Choose which alerts and notifications you want to receive.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-50 dark:bg-cyan-500/10">
          <FiBell className="h-6 w-6 text-cyan-500" />
        </div>

        <h3 className="mt-4 text-sm font-semibold text-gray-800 dark:text-white">
          Not available yet
        </h3>

        <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
          Notification preferences need backend work — there's no API for this yet,
          so there's nothing here to save.
        </p>
      </div>
    </div>
  );
}
