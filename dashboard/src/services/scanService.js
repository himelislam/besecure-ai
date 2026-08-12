import api from "./api";
import { unwrapResponse } from "../lib/apiResponse";

export const createScan = async ({ websiteId, type }) => {
  const response = await api.post("/api/scans", { websiteId, type });
  return unwrapResponse(response); // { scanId, status: "queued" } — no queue-position field
};

export const getScan = async (id) => {
  const response = await api.get(`/api/scans/${id}`);
  return unwrapResponse(response); // { scan }
};

// page/limit aren't Zod-validated here — only ever send real numbers.
export const getScanFindings = async (id, { page, limit } = {}) => {
  const response = await api.get(`/api/scans/${id}/findings`, { params: { page, limit } });
  return unwrapResponse(response); // { vulnerabilities, total, page, pages }
};

// Registered under /api/websites/, not /api/scans/, even though it's scan data.
export const getWebsiteScans = async (websiteId, { page, limit } = {}) => {
  const response = await api.get(`/api/websites/${websiteId}/scans`, { params: { page, limit } });
  return unwrapResponse(response); // { scans, total, page, pages }
};
