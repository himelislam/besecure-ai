import api from "./api";
import { unwrapResponse } from "../lib/apiResponse";

// No sessionId concept exists anywhere in this API — chat history is just
// "this user's last 30 messages," full stop.
export const sendMessage = async ({ content, scanId }) => {
  const body = { content };
  if (scanId) body.scanId = scanId;

  const response = await api.post("/api/chat/message", body);
  return unwrapResponse(response); // { message: {role:'assistant', content, ...}, aiAssisted, inputTokens, outputTokens }
};

// Always exactly the last 30 messages, oldest-first — no pagination params
// exist to load anything older.
export const getChatHistory = async () => {
  const response = await api.get("/api/chat/history");
  return unwrapResponse(response); // { messages: [{role, content, createdAt}] }
};

// Genuine hard delete server-side (ChatMessage.deleteMany), unlike every
// other resource in this app — callers must confirm before invoking this.
export const clearChatHistory = async () => {
  const response = await api.delete("/api/chat/history");
  return unwrapResponse(response); // { message }
};
