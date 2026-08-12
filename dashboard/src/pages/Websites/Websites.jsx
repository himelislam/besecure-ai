import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  FiPlus,
  FiSearch,
  FiGlobe,
  FiShield,
  FiAlertTriangle,
  FiMoreVertical,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiRefreshCw,
  FiCheckCircle,
} from "react-icons/fi";
import PageMeta from "../../components/common/PageMeta";
import { Modal } from "../../components/ui/modal";
import { useModal } from "../../hooks/useModal";
import {
  getWebsites,
  updateWebsite,
  deleteWebsite,
} from "../../services/websiteService";
import { getApiError } from "../../lib/apiResponse";

function formatRelativeTime(dateString) {
  if (!dateString) return "Never";

  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function getScoreStyle(score) {
  if (score == null) return "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
  if (score >= 80) return "bg-green-50 text-green-600 border-green-200";
  if (score >= 60) return "bg-yellow-50 text-yellow-600 border-yellow-200";
  return "bg-red-50 text-red-600 border-red-200";
}

export default function Websites() {
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState(null);

  const [websites, setWebsites] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const renameModal = useModal();

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteModal = useModal();

  const loadWebsites = async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const data = await getWebsites();
      setWebsites(data.websites);
      setTotal(data.total);
    } catch (err) {
      setLoadError(getApiError(err).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWebsites();
  }, []);

  const filteredWebsites = websites.filter(
    (website) =>
      website.domain.toLowerCase().includes(search.toLowerCase()) ||
      website.nickname.toLowerCase().includes(search.toLowerCase())
  );

  const verifiedCount = websites.filter((website) => website.verified).length;
  const pendingCount = websites.length - verifiedCount;

  const openRename = (website) => {
    setOpenMenu(null);
    setRenameTarget(website);
    setRenameValue(website.nickname);
    setRenameError("");
    renameModal.openModal();
  };

  const handleRename = async (e) => {
    e.preventDefault();

    if (!renameValue.trim()) {
      setRenameError("Name can't be empty.");
      return;
    }

    setRenameError("");
    setIsRenaming(true);

    try {
      const { website } = await updateWebsite(renameTarget._id, {
        nickname: renameValue.trim(),
      });

      setWebsites((prev) => prev.map((w) => (w._id === website._id ? website : w)));
      renameModal.closeModal();
    } catch (err) {
      setRenameError(getApiError(err).message);
    } finally {
      setIsRenaming(false);
    }
  };

  const openDelete = (website) => {
    setOpenMenu(null);
    setDeleteTarget(website);
    setDeleteError("");
    deleteModal.openModal();
  };

  const handleDelete = async () => {
    setDeleteError("");
    setIsDeleting(true);

    try {
      await deleteWebsite(deleteTarget._id);
      setWebsites((prev) => prev.filter((w) => w._id !== deleteTarget._id));
      setTotal((prev) => prev - 1);
      deleteModal.closeModal();
    } catch (err) {
      setDeleteError(getApiError(err).message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <PageMeta
        title="My Websites | BeSecure AI"
        description="Manage and monitor your websites with BeSecure AI"
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              My Websites
            </h1>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage your websites and monitor their security posture.
            </p>
          </div>

          <Link
            to="/websites/add"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            <FiPlus className="text-lg" />
            Add Website
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Websites</p>
                <h3 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white/90">{total}</h3>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
                <FiGlobe className="text-xl" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Verified</p>
                <h3 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white/90">{verifiedCount}</h3>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-600">
                <FiShield className="text-xl" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending Verification</p>
                <h3 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white/90">{pendingCount}</h3>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-50 text-yellow-600">
                <FiAlertTriangle className="text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Website List */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          {/* List Header */}
          <div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Website Assets
              </h2>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                All websites connected to your account.
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search websites..."
                className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-4 text-sm text-gray-700 outline-none transition focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500/30 border-t-brand-500" />
            </div>
          )}

          {!isLoading && loadError && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <FiAlertTriangle className="text-3xl text-red-400" />
              <p className="text-sm text-gray-600 dark:text-gray-300">{loadError}</p>
              <button
                type="button"
                onClick={loadWebsites}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Try again
              </button>
            </div>
          )}

          {!isLoading && !loadError && (
            <>
              {/* Desktop Table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
                      <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                        Website
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                        Security Score
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                        Verification
                      </th>

                      <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                        Last Scan
                      </th>

                      <th className="px-6 py-4 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredWebsites.map((website) => (
                      <tr
                        key={website._id}
                        className="transition hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                      >
                        {/* Website */}
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
                              <FiGlobe className="text-lg" />
                            </div>

                            <div>
                              <p className="font-medium text-gray-800 dark:text-white/90">
                                {website.nickname}
                              </p>

                              <p className="mt-1 text-sm text-gray-500">
                                {website.domain}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Score */}
                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex rounded-lg border px-3 py-1.5 text-sm font-semibold ${getScoreStyle(
                              website.lastScore
                            )}`}
                          >
                            {website.lastScore != null ? `${website.lastScore}/100` : "Not scanned"}
                          </span>
                        </td>

                        {/* Verification */}
                        <td className="px-6 py-5">
                          {website.verified ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-600">
                              <FiCheckCircle /> Verified
                            </span>
                          ) : (
                            <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-600">
                              Pending
                            </span>
                          )}
                        </td>

                        {/* Last Scan */}
                        <td className="px-6 py-5 text-sm text-gray-500">
                          {formatRelativeTime(website.lastScanAt)}
                        </td>

                        {/* Actions */}
                        <td className="relative px-6 py-5 text-right">
                          <button
                            onClick={() =>
                              setOpenMenu(
                                openMenu === website._id ? null : website._id
                              )
                            }
                            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-white"
                          >
                            <FiMoreVertical />
                          </button>

                          {openMenu === website._id && (
                            <div className="absolute right-6 top-14 z-20 w-44 rounded-xl border border-gray-200 bg-white p-2 text-left shadow-lg dark:border-gray-700 dark:bg-gray-900">
                              <Link
                                to={`/websites/${website._id}`}
                                onClick={() => setOpenMenu(null)}
                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                              >
                                <FiEye />
                                View Details
                              </Link>

                              <Link
                                to={`/websites/${website._id}/scan`}
                                onClick={() => setOpenMenu(null)}
                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                              >
                                <FiRefreshCw />
                                Scan Now
                              </Link>

                              <button
                                onClick={() => openRename(website)}
                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                              >
                                <FiEdit2 />
                                Rename
                              </button>

                              <button
                                onClick={() => openDelete(website)}
                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                              >
                                <FiTrash2 />
                                Remove
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="space-y-4 p-4 lg:hidden">
                {filteredWebsites.map((website) => (
                  <div
                    key={website._id}
                    className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
                          <FiGlobe />
                        </div>

                        <div>
                          <h3 className="font-medium text-gray-800 dark:text-white/90">
                            {website.nickname}
                          </h3>

                          <p className="text-sm text-gray-500">
                            {website.domain}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`rounded-lg border px-2 py-1 text-xs font-semibold ${getScoreStyle(
                          website.lastScore
                        )}`}
                      >
                        {website.lastScore != null ? website.lastScore : "—"}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-gray-50 p-3 dark:bg-white/[0.03]">
                        <p className="text-xs text-gray-500">Verification</p>
                        <p
                          className={`mt-1 text-sm font-medium ${
                            website.verified ? "text-green-600" : "text-yellow-600"
                          }`}
                        >
                          {website.verified ? "Verified" : "Pending"}
                        </p>
                      </div>

                      <div className="rounded-lg bg-gray-50 p-3 dark:bg-white/[0.03]">
                        <p className="text-xs text-gray-500">Last Scan</p>
                        <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                          {formatRelativeTime(website.lastScanAt)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Link
                        to={`/websites/${website._id}`}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        <FiEye />
                        Details
                      </Link>

                      <Link
                        to={`/websites/${website._id}/scan`}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-500 px-3 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
                      >
                        <FiRefreshCw />
                        Scan Now
                      </Link>
                    </div>

                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => openRename(website)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        <FiEdit2 />
                        Rename
                      </button>

                      <button
                        onClick={() => openDelete(website)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10"
                      >
                        <FiTrash2 />
                        Remove
                      </button>
                    </div>
                  </div>
                ))}

                {filteredWebsites.length === 0 && (
                  <EmptyState hasWebsites={websites.length > 0} />
                )}
              </div>

              {filteredWebsites.length === 0 && (
                <div className="hidden lg:block">
                  <EmptyState hasWebsites={websites.length > 0} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Rename Modal */}
      <Modal isOpen={renameModal.isOpen} onClose={renameModal.closeModal} className="max-w-md m-4">
        <form onSubmit={handleRename} className="p-6">
          <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
            Rename website
          </h3>

          <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
            Only the display name changes — {renameTarget?.domain} stays the same. To
            change the URL, delete and re-add the site.
          </p>

          {renameError && (
            <p className="mb-4 text-sm text-red-500">{renameError}</p>
          )}

          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            autoFocus
          />

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={renameModal.closeModal}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isRenaming}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {isRenaming ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModal.isOpen} onClose={deleteModal.closeModal} className="max-w-md m-4">
        <div className="p-6">
          <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
            Remove {deleteTarget?.nickname}?
          </h3>

          <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
            This removes the site from your dashboard. It won't appear in
            your website list anymore.
          </p>

          {deleteError && (
            <p className="mb-4 text-sm text-red-500">{deleteError}</p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={deleteModal.closeModal}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {isDeleting ? "Removing..." : "Remove"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function EmptyState({ hasWebsites }) {
  return (
    <div className="py-16 text-center">
      <FiGlobe className="mx-auto text-3xl text-gray-400" />

      <p className="mt-3 text-sm text-gray-500">
        {hasWebsites ? "No websites match your search." : "No websites yet."}
      </p>

      {!hasWebsites && (
        <Link
          to="/websites/add"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
        >
          <FiPlus />
          Add your first website
        </Link>
      )}
    </div>
  );
}
