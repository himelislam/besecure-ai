import { io } from "socket.io-client";
import { getAccessToken } from "../stores/authStore";

// Socket.io shares the same HTTP server/port as the REST API (see
// server/server.js — one httpServer for both), so this reuses the same
// base URL apiClient.js uses rather than needing a separate env var.
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// `auth` as a function (not a static object) is read fresh on every
// (re)connect attempt, so a token refreshed after the initial connect is
// picked up automatically instead of the socket being stuck with a stale one.
export const socket = io(BASE_URL, {
  autoConnect: false,
  withCredentials: true,
  auth: (callback) => callback({ token: getAccessToken() }),
});

export function connectSocket() {
  if (!getAccessToken()) return;
  if (socket.connected || socket.active) return;
  socket.connect();
}

export function disconnectSocket() {
  socket.disconnect();
}
