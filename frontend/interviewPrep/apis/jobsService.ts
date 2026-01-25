import { getAuthHeader } from "./authService";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface Job {
  id: number;
  title: string;
  company: string;
  status: "Upcoming" | "Completed";
  interviewType?: "technical" | "behavioral" | "both";
  url?: string;
  created_at: string;
  location?: string;
  salaryRange?: string;
  description?: string;
  requirements?: string[];
  responsibilities?: string[];
  benefits?: string[];
  technicalTopics?: string[];
  behavioralTopics?: string[];
  leetcodeTopics?: string[];
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

export interface CreateJobData {
  title: string;
  company: string;
  description?: string;
  location?: string;
  salaryRange?: string;
  requirements?: string;
  responsibilities?: string;
  benefits?: string;
  interviewType?: "technical" | "behavioral" | "both";
  url?: string;
}

/**
 * Create a new job application
 */
export async function createJobApplication(jobData: CreateJobData): Promise<Job> {
  try {
    console.log("📝 Creating job application...", jobData);

    const response = await fetch(`${API_BASE_URL}/api/jobs/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify(jobData),
    });

    console.log("📡 Create job API response status:", response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error("❌ Create job API error:", error);
      throw new Error(error.detail || "Failed to create job");
    }

    const data = await response.json();
    console.log("✅ Job created successfully", data);

    return data;
  } catch (error) {
    console.error("❌ Error creating job:", error);
    throw error;
  }
}

export interface AutoFillData {
  title: string;
  company: string;
  location: string;
  salaryRange: string;
  description: string;
  requirements: string;
  responsibilities: string;
  benefits: string;
  interviewType: "technical" | "behavioral" | "both";
}

/**
 * Auto-fill job details from URL
 */
export async function autoFillJobFromUrl(url: string): Promise<AutoFillData> {
  try {
    console.log("🤖 Auto-filling job from URL...", url);

    const response = await fetch(`${API_BASE_URL}/api/jobs/autofill`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify({ url }),
    });

    console.log("📡 Auto-fill API response status:", response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error("❌ Auto-fill API error:", error);
      throw new Error(error.detail || "Failed to auto-fill from URL");
    }

    const data = await response.json();
    console.log("✅ Job auto-filled successfully", data);

    return data;
  } catch (error) {
    console.error("❌ Error auto-filling job:", error);
    throw error;
  }
}

/**
 * Get a single job application by ID
 */
export async function getJobApplication(id: number): Promise<Job> {
  try {
    console.log(`📋 Fetching job application ${id}...`);

    const response = await fetch(`${API_BASE_URL}/api/jobs/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
    });

    console.log("📡 Job API response status:", response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error("❌ Job API error:", error);
      throw new Error(error.detail || "Failed to fetch job");
    }

    const data = await response.json();
    console.log("✅ Job fetched successfully", data);

    return data;
  } catch (error) {
    console.error("❌ Error fetching job:", error);
    throw error;
  }
}

/**
 * Update job status (Upcoming or Completed)
 */
export async function updateJobStatus(jobId: number, status: "Upcoming" | "Completed"): Promise<void> {
  try {
    console.log(`🔄 Updating job ${jobId} status to ${status}...`);

    const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify({ status }),
    });

    console.log("📡 Update status API response:", response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error("❌ Update status API error:", error);
      throw new Error(error.detail || "Failed to update job status");
    }

    console.log("✅ Job status updated successfully");
  } catch (error) {
    console.error("❌ Error updating job status:", error);
    throw error;
  }
}
