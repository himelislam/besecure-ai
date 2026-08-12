import { useCallback, useEffect, useRef, useState } from "react";
import { generateReport, getReport, getReports } from "../services/reportService";
import { socket, connectSocket } from "../lib/socketClient";
import { ErrorCodes, getApiError } from "../lib/apiResponse";

const POLL_INTERVAL_MS = 4000;

// Tracks generation for a single scan's report: kicks off POST
// /api/reports/:scanId, then follows the resulting report to completion via
// both the real report:complete/report:failed socket events (confirmed in
// server/services/queue/reportWorker.js) and a polling fallback — whichever
// fires first wins, the other just becomes a no-op once status is terminal.
export function useReportForScan(scanId) {
  const [report, setReport] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");
  const [limitMessage, setLimitMessage] = useState("");

  const pollTimeoutRef = useRef(null);
  const trackedReportIdRef = useRef(null);

  const stopTracking = () => {
    clearTimeout(pollTimeoutRef.current);
    pollTimeoutRef.current = null;
    trackedReportIdRef.current = null;
  };

  const fetchAndMaybeContinuePolling = useCallback((id) => {
    getReport(id)
      .then(({ report: fetched }) => {
        setReport(fetched);

        if (fetched.status === "generating") {
          pollTimeoutRef.current = setTimeout(() => fetchAndMaybeContinuePolling(id), POLL_INTERVAL_MS);
        } else {
          stopTracking();
        }
      })
      .catch((err) => {
        setError(getApiError(err).message);
        stopTracking();
      });
  }, []);

  const track = useCallback(
    (id) => {
      stopTracking();
      trackedReportIdRef.current = id;
      fetchAndMaybeContinuePolling(id);
    },
    [fetchAndMaybeContinuePolling]
  );

  useEffect(() => {
    connectSocket();

    const onSettled = (data) => {
      if (data.reportId === trackedReportIdRef.current) {
        fetchAndMaybeContinuePolling(data.reportId);
      }
    };

    socket.on("report:complete", onSettled);
    socket.on("report:failed", onSettled);

    return () => {
      socket.off("report:complete", onSettled);
      socket.off("report:failed", onSettled);
      stopTracking();
    };
  }, [fetchAndMaybeContinuePolling]);

  const generate = useCallback(async () => {
    if (!scanId) return;

    setError("");
    setLimitMessage("");
    setIsStarting(true);

    try {
      const { reportId, status } = await generateReport(scanId);

      if (status === "completed") {
        // Cached — already done, no need to poll/track.
        const { report: fetched } = await getReport(reportId);
        setReport(fetched);
      } else {
        track(reportId);
      }
    } catch (err) {
      const apiError = getApiError(err);

      if (apiError.code === ErrorCodes.PLAN_LIMIT_REACHED) {
        // A free-tier PLAN_LIMIT_REACHED here always means a non-failed
        // report already exists for this scan — but whether it's already
        // completed or still generating changes what the UI should show,
        // and there's no GET-by-scanId endpoint, so the only way to find
        // out is to look it up in the reports list.
        try {
          const { reports } = await getReports({ limit: 50 });
          const existing = reports.find((r) => r.scanId === scanId);

          if (existing?.status === "completed") {
            setReport(existing);
          } else if (existing) {
            setReport(existing);
            setLimitMessage(
              "You already have a report generating for this scan. Free tier allows one attempt at a time — upgrade for unlimited report generation."
            );
            track(existing._id);
          } else {
            setError(apiError.message);
          }
        } catch {
          setError(apiError.message);
        }
      } else {
        setError(apiError.message);
      }
    } finally {
      setIsStarting(false);
    }
  }, [scanId, track]);

  return { report, isStarting, error, limitMessage, generate };
}
