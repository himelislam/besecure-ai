import axios from "axios";
import { useAuthStore, getAccessToken } from "../stores/authStore";
import { disconnectSocket } from "./socketClient";

// API_REFERENCE.md's documented base URL is the bare host — every endpoint
// path already includes its own /api (or /webhooks, /internal) prefix.
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // required so the httpOnly refreshToken cookie is sent on /api/auth/refresh
  headers: {
    "Content-Type": "application/json",
  },
});

// Separate instance for the refresh call itself, so it never runs through
// the response interceptor below and can't trigger another refresh loop.
const refreshClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

function handleLogout() {
  useAuthStore.getState().clearAuth();
  disconnectSocket();

  if (typeof window !== "undefined" && window.location.pathname !== "/signin") {
    window.location.assign("/signin");
  }
}

// Concurrent 401s share a single in-flight refresh call instead of each
// firing their own POST /api/auth/refresh.
let refreshPromise = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post("/api/auth/refresh") // no body — the refreshToken cookie (path=/api/auth/refresh) is sent automatically
      .then((response) => {
        const token = response.data?.data?.accessToken;

        if (!token) {
          throw new Error("Refresh response did not include an access token");
        }

        useAuthStore.getState().setAccessToken(token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const url = originalRequest?.url || "";

    // Never attempt a refresh for the refresh call itself, or for
    // login/register — those 401s mean bad credentials, not an expired
    // access token, and retrying them after a refresh would be wrong.
    const isExemptFromRefresh =
      url.includes("/api/auth/refresh") ||
      url.includes("/api/auth/login") ||
      url.includes("/api/auth/register");

    if (status !== 401 || isExemptFromRefresh || originalRequest?._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const token = await refreshAccessToken();
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      handleLogout();
      return Promise.reject(refreshError);
    }
  }
);

export default apiClient;
