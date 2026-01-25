const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface LoginRequest {
  email: string;
  password?: string;
}

export interface SignupRequest {
  email: string;
  name: string;
  password?: string;
}

export interface AuthResponse {
  id: number;
  email: string;
  name: string;
  token: string;
}

/**
 * Login with email and optional password
 * If user doesn't exist, creates a new account automatically
 */
export async function login(credentials: LoginRequest): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Login API error:", error);
      throw new Error(error.detail || "Login failed");
    }

    const data = await response.json();
    console.log("Login successful", { userId: data.id, email: data.email });

    // Validate token exists before storing
    if (!data.token) {
      console.error("No token received from login");
      throw new Error("Invalid response: no authentication token received");
    }

    // Store token in localStorage for future requests
    localStorage.setItem("authToken", data.token);
    localStorage.setItem("userId", data.id.toString());
    localStorage.setItem("userEmail", data.email);
    console.log("Authentication token stored successfully");

    return data;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

/**
 * Sign up with email, name, and optional password
 * Uses the same login endpoint as it auto-creates users
 */
export async function signup(
  credentials: SignupRequest,
): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Signup API error:", error);
      throw new Error(error.detail || "Signup failed");
    }

    const data = await response.json();
    console.log("Signup successful", { userId: data.id, email: data.email });

    // Validate token exists before storing
    if (!data.token) {
      console.error("No token received from signup");
      throw new Error("Invalid response: no authentication token received");
    }

    // Store token in localStorage for future requests
    localStorage.setItem("authToken", data.token);
    localStorage.setItem("userId", data.id.toString());
    localStorage.setItem("userEmail", data.email);
    console.log("Authentication token stored successfully");

    return data;
  } catch (error) {
    console.error("Signup error:", error);
    throw error;
  }
}

/**
 * Logout - clear stored authentication
 */
export function logout(): void {
  localStorage.removeItem("authToken");
  localStorage.removeItem("userId");
  localStorage.removeItem("userEmail");
}

/**
 * Get stored auth token
 */
export function getAuthToken(): string | null {
  return localStorage.getItem("authToken");
}

/**
 * Get stored user ID
 */
export function getUserId(): number | null {
  const id = localStorage.getItem("userId");
  return id ? parseInt(id, 10) : null;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

/**
 * Get authorization header for API requests
 */
export function getAuthHeader(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
