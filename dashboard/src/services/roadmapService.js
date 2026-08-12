import api from "./api";
import { unwrapResponse } from "../lib/apiResponse";

// Synchronous — no BullMQ job, no polling. The request itself blocks until
// the Claude call finishes (or fails). 200 = an already-completed roadmap
// existed and is returned as-is; 201 = freshly generated. Both render the
// same way, so callers don't need to distinguish the status code.
export const generateRoadmap = async (scanId) => {
  const response = await api.post(`/api/roadmaps/${scanId}`);
  return unwrapResponse(response); // { roadmap }
};

export const getRoadmap = async (scanId) => {
  const response = await api.get(`/api/roadmaps/${scanId}`);
  return unwrapResponse(response); // { roadmap }
};

// No request body — this is a pure toggle of that step's isDone, not a set.
export const toggleRoadmapStep = async (roadmapId, stepId) => {
  const response = await api.patch(`/api/roadmaps/${roadmapId}/steps/${stepId}`);
  return unwrapResponse(response); // { roadmap } — with the target step's isDone flipped
};
