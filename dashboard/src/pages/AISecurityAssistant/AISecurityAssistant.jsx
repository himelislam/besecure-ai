import { useEffect, useRef, useState } from "react";
import {
  FiSend,
  FiShield,
  FiUser,
  FiCopy,
  FiTrash2,
  FiMessageCircle,
  FiAlertTriangle,
  FiRefreshCw,
  FiX,
} from "react-icons/fi";
import PageMeta from "../../components/common/PageMeta";
import { Modal } from "../../components/ui/modal";
import { useModal } from "../../hooks/useModal";
import { useAllScans } from "../../hooks/useAllScans";
import { sendMessage, getChatHistory, clearChatHistory } from "../../services/chatService";
import { ErrorCodes, getApiError } from "../../lib/apiResponse";

const MAX_LENGTH = 2000;

const suggestions = [
  "How can I fix XSS vulnerabilities?",
  "Explain SQL Injection",
  "How do I secure my website?",
  "What is OWASP Top 10?",
];

let localKeySeq = 0;
const nextLocalKey = () => `local-${Date.now()}-${localKeySeq++}`;

export default function AISecurityAssistant() {
  const [messages, setMessages] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState("");

  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const [attachedScanId, setAttachedScanId] = useState("");

  const clearModal = useModal();
  const [isClearing, setIsClearing] = useState(false);
  const [clearError, setClearError] = useState("");

  const { scans } = useAllScans();
  const scannableOptions = scans.filter((s) => s.status === "completed");

  const scrollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    getChatHistory()
      .then(({ messages: history }) => {
        if (cancelled) return;
        setMessages(
          history.map((m) => ({
            key: nextLocalKey(),
            role: m.role,
            content: m.content,
            createdAt: m.createdAt,
            // History has no aiAssisted flag — every assistant-role message
            // in this system is AI-generated, so the label applies the same way.
            aiAssisted: m.role === "assistant",
            status: "sent",
          }))
        );
      })
      .catch((err) => setHistoryError(getApiError(err).message))
      .finally(() => setIsLoadingHistory(false));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const doSend = async (content, existingKey) => {
    const key = existingKey || nextLocalKey();

    if (!existingKey) {
      setMessages((prev) => [
        ...prev,
        { key, role: "user", content, status: "sending" },
      ]);
    } else {
      setMessages((prev) => prev.map((m) => (m.key === key ? { ...m, status: "sending" } : m)));
    }

    setSendError("");
    setIsSending(true);

    try {
      const { message: assistantMessage, aiAssisted } = await sendMessage({
        content,
        scanId: attachedScanId || undefined,
      });

      setMessages((prev) => [
        ...prev.map((m) => (m.key === key ? { ...m, status: "sent" } : m)),
        {
          key: nextLocalKey(),
          role: "assistant",
          content: assistantMessage.content,
          createdAt: assistantMessage.createdAt,
          aiAssisted,
          status: "sent",
        },
      ]);
    } catch (err) {
      const apiError = getApiError(err);

      // Neither message is persisted server-side when this call fails (the
      // Claude call happens before either ChatMessage is saved) — a reload
      // wouldn't show this bubble, so it's marked failed rather than left
      // looking like a normal, successfully-sent message.
      setMessages((prev) => prev.map((m) => (m.key === key ? { ...m, status: "failed" } : m)));

      if (apiError.code === ErrorCodes.RATE_LIMITED && apiError.message.includes("Daily AI message limit")) {
        setSendError("You've used your AI messages for today — resets at midnight.");
      } else if (
        apiError.code === ErrorCodes.AI_UNAVAILABLE ||
        apiError.code === ErrorCodes.INTERNAL_ERROR ||
        apiError.status === 500
      ) {
        // Covers both the documented generic 500 INTERNAL_ERROR and the
        // real 503 AI_UNAVAILABLE the API actually returns for any Claude
        // API failure (auth/rate-limit/overload/timeout) — same soft message either way.
        setSendError("The assistant is temporarily unavailable. Please try again.");
      } else {
        setSendError(apiError.message);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = (text = input) => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > MAX_LENGTH || isSending) return;

    setInput("");
    doSend(trimmed);
  };

  const handleRetry = (message) => {
    if (isSending) return;
    doSend(message.content, message.key);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = async () => {
    setClearError("");
    setIsClearing(true);

    try {
      await clearChatHistory();
      setMessages([]);
      clearModal.closeModal();
    } catch (err) {
      setClearError(getApiError(err).message);
    } finally {
      setIsClearing(false);
    }
  };

  const attachedScan = scannableOptions.find((s) => s._id === attachedScanId);
  const overLimit = input.length > MAX_LENGTH;

  return (
    <>
      <PageMeta
        title="AI Security Assistant | BeSecure AI"
        description="AI-powered cybersecurity assistant"
      />

      <div className="flex h-[calc(100vh-120px)] min-h-[650px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm">
              <FiShield size={22} />
            </div>

            <div>
              <h1 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                AI Security Assistant
              </h1>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                Your intelligent cybersecurity companion
              </p>
            </div>
          </div>

          <button
            onClick={clearModal.openModal}
            disabled={messages.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.05]"
          >
            <FiTrash2 size={15} />
            <span className="hidden sm:block">Clear History</span>
          </button>
        </div>

        {/* Chat Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto max-w-4xl space-y-6">
            {isLoadingHistory && (
              <div className="flex items-center justify-center py-12">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500/30 border-t-brand-500" />
              </div>
            )}

            {!isLoadingHistory && historyError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {historyError}
              </div>
            )}

            {!isLoadingHistory && !historyError && messages.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <FiShield className="text-3xl text-gray-300" />
                <p className="text-sm text-gray-500">
                  Ask about vulnerabilities, security risks, OWASP Top 10, or how to fix a finding.
                </p>
              </div>
            )}

            {messages.map((item) => (
              <div
                key={item.key}
                className={`flex gap-3 ${item.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {item.role === "assistant" && (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white">
                    <FiShield size={17} />
                  </div>
                )}

                <div
                  className={`max-w-[80%] ${
                    item.role === "user"
                      ? `order-first rounded-2xl rounded-tr-md px-4 py-3 text-white ${
                          item.status === "failed" ? "bg-red-400" : "bg-brand-500"
                        } ${item.status === "sending" ? "opacity-60" : ""}`
                      : "rounded-2xl rounded-tl-md border border-gray-200 bg-gray-50 px-4 py-3 text-gray-700 dark:border-gray-800 dark:bg-white/[0.04] dark:text-gray-300"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm leading-6">{item.content}</p>

                  {item.role === "assistant" && item.aiAssisted && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                      AI-Assisted Guidance
                    </span>
                  )}

                  {item.role === "assistant" && (
                    <button
                      onClick={() => navigator.clipboard?.writeText(item.content)}
                      className="mt-3 flex items-center gap-1.5 text-xs text-gray-400 transition hover:text-brand-500"
                    >
                      <FiCopy size={13} />
                      Copy
                    </button>
                  )}

                  {item.role === "user" && item.status === "failed" && (
                    <button
                      onClick={() => handleRetry(item)}
                      className="mt-2 flex items-center gap-1.5 text-xs text-white/90 underline"
                    >
                      <FiRefreshCw size={12} />
                      Failed to send — not saved. Retry?
                    </button>
                  )}
                </div>

                {item.role === "user" && (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300">
                    <FiUser size={17} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Suggestions */}
        {!isLoadingHistory && messages.length === 0 && (
          <div className="border-t border-gray-100 px-4 py-4 dark:border-gray-800 sm:px-8">
            <div className="mx-auto max-w-4xl">
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                <FiMessageCircle size={14} />
                Try asking
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSend(suggestion)}
                    className="whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 transition hover:border-brand-500 hover:text-brand-500 dark:border-gray-700 dark:bg-white/[0.02] dark:text-gray-300"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Send error */}
        {sendError && (
          <div className="mx-4 mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 sm:mx-8">
            <FiAlertTriangle className="mt-0.5 shrink-0" />
            {sendError}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-transparent sm:p-6">
          <div className="mx-auto max-w-4xl">
            {/* Scan context attach */}
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {attachedScan ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                  Context: scan from {new Date(attachedScan.createdAt).toLocaleDateString()} (score {attachedScan.score ?? "—"})
                  <button onClick={() => setAttachedScanId("")} aria-label="Remove scan context">
                    <FiX size={12} />
                  </button>
                </span>
              ) : (
                scannableOptions.length > 0 && (
                  <select
                    value={attachedScanId}
                    onChange={(e) => setAttachedScanId(e.target.value)}
                    className="h-8 rounded-full border border-gray-200 bg-white px-3 text-xs text-gray-600 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                  >
                    <option value="">Attach scan context (optional)</option>
                    {scannableOptions.slice(0, 20).map((scan) => (
                      <option key={scan._id} value={scan._id}>
                        {new Date(scan.createdAt).toLocaleDateString()} — score {scan.score ?? "—"}
                      </option>
                    ))}
                  </select>
                )
              )}
            </div>

            <div
              className={`relative flex items-end rounded-xl border bg-gray-50 p-2 transition dark:bg-white/[0.03] ${
                overLimit ? "border-red-400" : "border-gray-200 focus-within:border-brand-500 dark:border-gray-700"
              }`}
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={isSending}
                placeholder="Ask anything about website security..."
                className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-gray-800 outline-none placeholder:text-gray-400 disabled:opacity-60 dark:text-white/90"
              />

              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || overLimit || isSending}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FiSend size={17} />
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
              <p>AI-generated security guidance may require verification before applying changes to production systems.</p>
              <span className={overLimit ? "text-red-500" : ""}>{input.length}/{MAX_LENGTH}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Clear history confirmation — this is a genuine hard delete */}
      <Modal isOpen={clearModal.isOpen} onClose={clearModal.closeModal} className="max-w-md m-4">
        <div className="p-6">
          <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
            Clear chat history?
          </h3>

          <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
            This permanently deletes your chat history and cannot be undone.
          </p>

          {clearError && <p className="mb-4 text-sm text-red-500">{clearError}</p>}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={clearModal.closeModal}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleClearHistory}
              disabled={isClearing}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {isClearing ? "Deleting..." : "Permanently Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
