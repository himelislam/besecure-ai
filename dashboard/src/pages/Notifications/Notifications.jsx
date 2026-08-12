import { Link } from "react-router";
import { FiBell } from "react-icons/fi";
import PageMeta from "../../components/common/PageMeta";

// No notification backend exists yet — no routes/controllers/models
// mention "notification" anywhere in server/, and it's not in
// API_REFERENCE.md. This page previously showed fabricated notifications
// (fake unread counts, fake alerts linking to real pages) with no real data
// behind any of it. Rather than fake it further, this is an honest
// "not built yet" state until a real backend feature exists to wire it to.
const Notifications = () => {
  return (
    <>
      <PageMeta
        title="Notifications | SecureSphere"
        description="SecureSphere notification center"
      />

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
            Notifications
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Stay updated with your security activity and alerts.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-20 text-center dark:border-gray-700 dark:bg-white/[0.03]">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-50 dark:bg-cyan-500/10">
            <FiBell className="h-7 w-7 text-cyan-500" />
          </div>

          <h3 className="mt-5 text-lg font-semibold text-gray-800 dark:text-white">
            Notifications aren't available yet
          </h3>

          <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            This feature needs backend work — there's no notifications API yet. In
            the meantime, check your <Link to="/vulnerabilities" className="text-cyan-500 hover:underline">vulnerabilities</Link> and <Link to="/scans" className="text-cyan-500 hover:underline">scans</Link> pages directly for the latest activity.
          </p>
        </div>
      </div>
    </>
  );
};

export default Notifications;
