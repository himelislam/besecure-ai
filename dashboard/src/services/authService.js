import api from "./api";
import { unwrapResponse } from "../lib/apiResponse";

export const register = async ({ name, email, password }) => {
  const response = await api.post("/api/auth/register", { name, email, password });
  return unwrapResponse(response); // { message: "Registration successful", user } — account is usable immediately, no email verification step
};

export const login = async ({ email, password }) => {
  const response = await api.post("/api/auth/login", { email, password });
  return unwrapResponse(response); // { accessToken, user }
};

export const logout = async () => {
  const response = await api.post("/api/auth/logout");
  return unwrapResponse(response); // { message: "Logged out" }
};

export const verifyEmail = async (token) => {
  const response = await api.get("/api/auth/verify-email", { params: { token } });
  return unwrapResponse(response); // { message: "Email verified" }
};

export const forgotPassword = async (email) => {
  const response = await api.post("/api/auth/forgot-password", { email });
  return unwrapResponse(response); // { message: "Reset link sent if email exists" }
};

export const resetPassword = async ({ token, newPassword }) => {
  const response = await api.post("/api/auth/reset-password", { token, newPassword });
  return unwrapResponse(response); // { message: "Password updated" }
};

// Used directly by the bootstrap-on-load flow (useAuth's initializeAuth).
// The apiClient response interceptor also calls POST /api/auth/refresh on a
// reactive 401, but that path is internal to apiClient.js — this is the
// standalone version for proactively re-establishing a session on page load.
export const refresh = async () => {
  const response = await api.post("/api/auth/refresh");
  return unwrapResponse(response); // { accessToken }
};

export const getMe = async () => {
  const response = await api.get("/api/auth/me");
  return unwrapResponse(response); // { user }
};

export const updateMe = async ({ name, avatar }) => {
  const body = {};
  if (name !== undefined) body.name = name;
  if (avatar !== undefined) body.avatar = avatar;

  const response = await api.patch("/api/auth/me", body);
  return unwrapResponse(response); // { user }
};

export const changePassword = async ({ currentPassword, newPassword }) => {
  const response = await api.post("/api/auth/change-password", {
    currentPassword,
    newPassword,
  });

  return unwrapResponse(response); // { message: "Password changed" }
};
