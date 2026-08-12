import api from "./api";
import { unwrapResponse } from "../lib/apiResponse";

// GET /api/websites' page/limit params aren't Zod-validated on the backend
// (bad values just silently fall back to defaults) — callers of this
// function should only ever pass real numbers, never trust the backend to
// reject garbage here.
export const getWebsites = async ({ page, limit } = {}) => {
  const response = await api.get("/api/websites", { params: { page, limit } });
  return unwrapResponse(response); // { websites, total, page, pages }
};

export const createWebsite = async ({ url, nickname }) => {
  const response = await api.post("/api/websites", { url, nickname });
  return unwrapResponse(response); // { website, verificationInstructions }
};

export const getWebsite = async (id) => {
  const response = await api.get(`/api/websites/${id}`);
  return unwrapResponse(response); // { website }
};

// .strict() on the backend — only ever send { nickname }. url/domain can't
// be changed after creation (add a new website instead).
export const updateWebsite = async (id, { nickname }) => {
  const response = await api.patch(`/api/websites/${id}`, { nickname });
  return unwrapResponse(response); // { website }
};

export const deleteWebsite = async (id) => {
  const response = await api.delete(`/api/websites/${id}`);
  return unwrapResponse(response); // { message }
};

// Same instructions shape POST /api/websites returns under
// `verificationInstructions` — this is how a user re-fetches them after
// navigating away before finishing verification.
export const getWebsiteVerification = async (id) => {
  const response = await api.get(`/api/websites/${id}/verify`);
  return unwrapResponse(response); // { token, dns, metaTag }
};

// No request body — always checks both DNS and meta tag in one call.
// verified:false is a normal outcome, not a thrown error.
export const verifyWebsite = async (id) => {
  const response = await api.post(`/api/websites/${id}/verify`);
  return unwrapResponse(response); // { verified, message }
};
