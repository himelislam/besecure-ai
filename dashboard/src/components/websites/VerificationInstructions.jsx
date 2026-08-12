import { useState } from "react";
import { FiCheckCircle, FiCopy, FiInfo, FiRefreshCw } from "react-icons/fi";
import { verifyWebsite } from "../../services/websiteService";
import { getApiError } from "../../lib/apiResponse";

// Renders the DNS TXT / meta-tag proof for a website and lets the user
// trigger POST /api/websites/:id/verify, which always checks both at once.
// verified:false is a normal response (not an error) — the user just hasn't
// added the record/tag yet (or DNS hasn't propagated), so it's shown as an
// inline status message and the instructions stay on screen for another try.
export default function VerificationInstructions({ websiteId, instructions, onVerified }) {
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState(null); // { verified, message } | null
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const { dns, metaTag } = instructions;

  const handleCopy = async (value, key) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      // Clipboard access can be denied by the browser — not worth
      // surfacing as an error, the value is still shown on screen to copy manually.
    }
  };

  const handleCheck = async () => {
    setIsChecking(true);
    setError("");
    setResult(null);

    try {
      const outcome = await verifyWebsite(websiteId);
      setResult(outcome);

      if (outcome.verified) {
        onVerified?.();
      }
    } catch (err) {
      setError(getApiError(err).message);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <p className="mb-3 text-sm font-medium text-gray-800 dark:text-white/90">
          Option 1 — Add a DNS TXT record
        </p>

        <div className="space-y-2 text-sm">
          <FieldRow label="Type" value={dns.type} copyKey="dns-type" copied={copied} onCopy={handleCopy} />
          <FieldRow label="Host" value={dns.host} copyKey="dns-host" copied={copied} onCopy={handleCopy} />
          <FieldRow label="Value" value={dns.value} copyKey="dns-value" copied={copied} onCopy={handleCopy} />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <p className="mb-3 text-sm font-medium text-gray-800 dark:text-white/90">
          Option 2 — Add a meta tag
        </p>

        <div className="flex items-start justify-between gap-3 rounded-lg bg-gray-50 p-3 dark:bg-white/[0.03]">
          <code className="break-all text-xs text-gray-700 dark:text-gray-300">{metaTag.tag}</code>

          <button
            type="button"
            onClick={() => handleCopy(metaTag.tag, "meta-tag")}
            className="shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
            aria-label="Copy meta tag"
          >
            {copied === "meta-tag" ? <FiCheckCircle className="text-green-500" /> : <FiCopy />}
          </button>
        </div>

        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{metaTag.placement}</p>
      </div>

      <p className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
        <FiInfo className="mt-0.5 shrink-0" />
        Only one of the two is required. DNS changes can take a while to
        propagate — if verification fails right after adding the record, try
        again in a few minutes.
      </p>

      {result && !result.verified && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700 dark:border-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-400">
          {result.message}
        </div>
      )}

      {result && result.verified && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400">
          <FiCheckCircle />
          {result.message}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleCheck}
        disabled={isChecking}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <FiRefreshCw className={isChecking ? "animate-spin" : ""} />
        {isChecking ? "Checking..." : "Check Verification"}
      </button>
    </div>
  );
}

function FieldRow({ label, value, copyKey, copied, onCopy }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/[0.03]">
      <div className="min-w-0">
        <span className="mr-2 text-xs font-medium uppercase text-gray-500">{label}</span>
        <span className="break-all font-mono text-xs text-gray-800 dark:text-gray-200">{value}</span>
      </div>

      <button
        type="button"
        onClick={() => onCopy(value, copyKey)}
        className="shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
        aria-label={`Copy ${label}`}
      >
        {copied === copyKey ? <FiCheckCircle className="text-green-500" /> : <FiCopy />}
      </button>
    </div>
  );
}
