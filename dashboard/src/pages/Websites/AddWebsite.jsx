import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  FiArrowLeft,
  FiGlobe,
  FiShield,
  FiInfo,
  FiCheckCircle,
} from "react-icons/fi";
import PageMeta from "../../components/common/PageMeta";
import VerificationInstructions from "../../components/websites/VerificationInstructions";
import { createWebsite } from "../../services/websiteService";
import { ErrorCodes, getApiError } from "../../lib/apiResponse";

export default function AddWebsite() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nickname: "",
    url: "",
  });

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Once the site is created, the response's verificationInstructions are
  // shown immediately here instead of firing a second request for them.
  const [created, setCreated] = useState(null); // { website, verificationInstructions } | null
  const [isVerified, setIsVerified] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nickname.trim()) {
      setError("Please enter a website name.");
      return;
    }

    if (!formData.url.trim()) {
      setError("Please enter a website URL.");
      return;
    }

    try {
      new URL(formData.url);
    } catch {
      setError("Please enter a valid website URL.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const result = await createWebsite({
        url: formData.url.trim(),
        nickname: formData.nickname.trim(),
      });

      setCreated(result);
    } catch (err) {
      const apiError = getApiError(err);

      if (apiError.code === ErrorCodes.PLAN_LIMIT_REACHED) {
        setError("You've reached your plan's website limit. Upgrade to add more sites.");
      } else if (apiError.code === ErrorCodes.DUPLICATE_KEY) {
        setError("You've already added this domain.");
      } else {
        setError(apiError.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (created) {
    return (
      <>
        <PageMeta
          title="Verify Website | BeSecure AI"
          description="Verify ownership of your website"
        />

        <div className="space-y-6">
          <div>
            <Link
              to="/websites"
              className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-brand-500"
            >
              <FiArrowLeft />
              Back to Websites
            </Link>

            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
              {created.website.nickname} was added
            </h1>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Verify you own <span className="font-medium">{created.website.domain}</span> to
              unlock deep scans. Baseline scans work without verification.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
                {isVerified ? (
                  <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400">
                    <FiCheckCircle className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">Domain verified</p>
                      <p className="mt-1">You can now run deep scans on this website.</p>
                    </div>
                  </div>
                ) : (
                  <VerificationInstructions
                    websiteId={created.website._id}
                    instructions={created.verificationInstructions}
                    onVerified={() => setIsVerified(true)}
                  />
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                <h3 className="font-semibold text-gray-800 dark:text-white/90">What's next?</h3>

                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Verification isn't required right away — you can finish it
                  later from the website's details page and still run a
                  baseline scan now.
                </p>

                <div className="mt-5 flex flex-col gap-3">
                  <Link
                    to={`/websites/${created.website._id}`}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-600"
                  >
                    <FiShield />
                    Go to website details
                  </Link>

                  <button
                    type="button"
                    onClick={() => navigate("/websites")}
                    className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-200 px-5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Back to My Websites
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title="Add Website | BeSecure AI"
        description="Add a website to BeSecure AI"
      />

      <div className="space-y-6">
        {/* Header */}
        <div>
          <Link
            to="/websites"
            className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-brand-500"
          >
            <FiArrowLeft />
            Back to Websites
          </Link>

          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Add Website
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Add a website to start monitoring and improving its security.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Form */}
          <div className="xl:col-span-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  Website Information
                </h2>

                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Provide the basic information about your website.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Website Name */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Website Name
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <input
                    type="text"
                    name="nickname"
                    value={formData.nickname}
                    onChange={handleChange}
                    placeholder="e.g. Company Website"
                    disabled={isSubmitting}
                    className="h-12 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />

                  <p className="mt-2 text-xs text-gray-500">
                    Give your website a recognizable name.
                  </p>
                </div>

                {/* Website URL */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Website URL
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <div className="relative">
                    <FiGlobe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />

                    <input
                      type="url"
                      name="url"
                      value={formData.url}
                      onChange={handleChange}
                      placeholder="https://example.com"
                      disabled={isSubmitting}
                      className="h-12 w-full rounded-lg border border-gray-200 bg-white pl-11 pr-4 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    />
                  </div>

                  <p className="mt-2 text-xs text-gray-500">
                    Enter the full URL including https:// — the path is
                    stripped, only the domain is stored.
                  </p>
                </div>

                {/* Error */}
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                {/* Buttons */}
                <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 dark:border-gray-800 sm:flex-row sm:justify-end">
                  <Link
                    to="/websites"
                    className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-200 px-5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </Link>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FiShield />
                    {isSubmitting ? "Adding..." : "Add Website"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Information Panel */}
          <div className="space-y-6">
            {/* What happens next */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
                  <FiShield />
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white/90">
                    What happens next?
                  </h3>

                  <p className="text-xs text-gray-500">
                    Your security journey starts here.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {[
                  "Website will be added to your assets.",
                  "You'll get DNS/meta-tag instructions to verify it.",
                  "A baseline scan can be started right away.",
                  "Deep scans unlock once ownership is verified.",
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <FiCheckCircle className="mt-0.5 shrink-0 text-green-500" />

                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Security Notice */}
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-500/20 dark:bg-blue-500/5">
              <div className="flex gap-3">
                <FiInfo className="mt-0.5 shrink-0 text-blue-500" />

                <div>
                  <h3 className="font-medium text-blue-700">
                    Security Notice
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-blue-600">
                    Only add websites that you own or have explicit
                    authorization to test. Unauthorized security testing may
                    violate laws or service agreements.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
