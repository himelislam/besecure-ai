import api from "./api";
import { unwrapResponse } from "../lib/apiResponse";

// No request body. 200 = a completed report already existed for this scan
// (cached, not regenerated); 201 = a new async job was queued. Both just
// return { reportId, status } — the download link only ever comes from
// GET /api/reports/:id's report.cloudinaryUrl, never from this response.
export const generateReport = async (scanId) => {
  const response = await api.post(`/api/reports/${scanId}`);
  return unwrapResponse(response); // { reportId, status: "completed" | "generating" }
};

export const getReport = async (id) => {
  const response = await api.get(`/api/reports/${id}`);
  return unwrapResponse(response); // { report }
};

// page/limit aren't Zod-validated — only ever send real numbers. No status/
// website/scan filter param exists on this endpoint; filter client-side.
export const getReports = async ({ page, limit } = {}) => {
  const response = await api.get("/api/reports", { params: { page, limit } });
  return unwrapResponse(response); // { reports, total, page, pages }
};
