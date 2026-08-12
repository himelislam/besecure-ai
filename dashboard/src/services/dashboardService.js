import api from "./api";
import { unwrapResponse } from "../lib/apiResponse";

export const getDashboardSummary = async () => {
  const response = await api.get("/api/dashboard/summary");
  return unwrapResponse(response);
  // { totalWebsites, totalScans, openVulnerabilities, averageScore,
  //   websitesSummary, recentScans, riskDistribution, scoreHistory }
};
