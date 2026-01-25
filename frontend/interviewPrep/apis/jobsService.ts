import { getAuthHeader } from "./authService";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface Job {
  id: number;
  title: string;
  company: string;
  status: "Applied" | "Interviewing" | "Rejected" | "Offer";
  matchScore?: number;
  url?: string;
  created_at: string;
}

/**
 * Get all job applications for the current user
 */
export async function getJobApplications(): Promise<Job[]> {
  try {
    console.log("📋 Fetching job applications...");

    const response = await fetch(`${API_BASE_URL}/api/jobs`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
    });

    console.log("📡 Jobs API response status:", response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error("❌ Jobs API error:", error);
      throw new Error(error.detail || "Failed to fetch jobs");
    }

    const data = await response.json();
    console.log("✅ Jobs fetched successfully", { count: data.length });
    console.log("📊 Jobs data:", data);

    return data;
  } catch (error) {
    console.error("❌ Error fetching jobs:", error);
    throw error;
  }
}
