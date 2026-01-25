import { getAuthHeader } from "./authService";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface Profile {
  id: number;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  portfolio?: string;
  summary?: string;
  workExperience?: string;
  education?: string;
  skills?: string;
  certifications?: string;
}

export interface UpdateProfileData {
  name?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  portfolio?: string;
  summary?: string;
  workExperience?: string;
  education?: string;
  skills?: string;
  certifications?: string;
}

/**
 * Get current user's profile
 */
export async function getProfile(): Promise<Profile> {
  try {
    console.log("📋 Fetching user profile...");

    const response = await fetch(`${API_BASE_URL}/api/profile`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
    });

    console.log("📡 Profile API response status:", response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error("❌ Profile API error:", error);
      throw new Error(error.detail || "Failed to fetch profile");
    }

    const data = await response.json();
    console.log("✅ Profile fetched successfully", data);

    return data;
  } catch (error) {
    console.error("❌ Error fetching profile:", error);
    throw error;
  }
}

/**
 * Update user profile
 */
export async function updateProfile(profileData: UpdateProfileData): Promise<Profile> {
  try {
    console.log("💾 Updating profile...", profileData);

    const response = await fetch(`${API_BASE_URL}/api/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify(profileData),
    });

    console.log("📡 Update profile API response status:", response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error("❌ Update profile API error:", error);
      throw new Error(error.detail || "Failed to update profile");
    }

    const data = await response.json();
    console.log("✅ Profile updated successfully", data);

    return data;
  } catch (error) {
    console.error("❌ Error updating profile:", error);
    throw error;
  }
}
