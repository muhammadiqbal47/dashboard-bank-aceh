import { User, Branch, PerformanceRecord } from "../types";

const API_BASE = "";

// Helper to fetch with token
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<any> {
  const token = localStorage.getItem("bank_aceh_token");
  
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, { ...options, headers });
  
  if (response.status === 401 || response.status === 403) {
    // Session expired, clear token and redirect/reload
    localStorage.removeItem("bank_aceh_token");
    localStorage.removeItem("bank_aceh_user");
    // Only dispatch custom event for App to handle
    window.dispatchEvent(new Event("auth-expired"));
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || "Sesi berakhir. Silakan login kembali.");
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Authentication
  async login(username: string, password: string): Promise<{ token: string; user: User }> {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Login gagal. Periksa username dan password.");
    }
    
    const data = await res.json();
    localStorage.setItem("bank_aceh_token", data.token);
    localStorage.setItem("bank_aceh_user", JSON.stringify(data.user));
    return data;
  },

  async getMe(): Promise<User> {
    return fetchWithAuth("/api/auth/me");
  },

  logout(): void {
    localStorage.removeItem("bank_aceh_token");
    localStorage.removeItem("bank_aceh_user");
  },

  getCurrentUser(): User | null {
    const u = localStorage.getItem("bank_aceh_user");
    return u ? JSON.parse(u) : null;
  },

  // Users Management (Admin)
  async getUsers(): Promise<User[]> {
    return fetchWithAuth("/api/users");
  },

  async createUser(user: Partial<User> & { password?: string }): Promise<User> {
    return fetchWithAuth("/api/users", {
      method: "POST",
      body: JSON.stringify(user)
    });
  },

  async updateUser(id: string, user: Partial<User> & { password?: string }): Promise<User> {
    return fetchWithAuth(`/api/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(user)
    });
  },

  async deleteUser(id: string): Promise<{ message: string }> {
    return fetchWithAuth(`/api/users/${id}`, {
      method: "DELETE"
    });
  },

  // Branches
  async getBranches(): Promise<Branch[]> {
    const res = await fetch("/api/branches");
    if (!res.ok) throw new Error("Gagal memuat daftar cabang.");
    return res.json();
  },

  // Settings
  async getSettings(): Promise<{ notificationThreshold: number }> {
    return fetchWithAuth("/api/settings");
  },

  async updateSettings(notificationThreshold: number): Promise<{ message: string; notificationThreshold: number }> {
    return fetchWithAuth("/api/settings", {
      method: "POST",
      body: JSON.stringify({ notificationThreshold })
    });
  },

  // Performance Records
  async getPerformance(filters: { kodeCabang?: string; startDate?: string; endDate?: string } = {}): Promise<PerformanceRecord[]> {
    const query = new URLSearchParams();
    if (filters.kodeCabang) query.append("kodeCabang", filters.kodeCabang);
    if (filters.startDate) query.append("startDate", filters.startDate);
    if (filters.endDate) query.append("endDate", filters.endDate);

    const res = await fetch(`/api/performance?${query.toString()}`);
    if (!res.ok) throw new Error("Gagal mengambil data pencapaian.");
    return res.json();
  },

  async importPerformance(tanggal: string, rows: any[]): Promise<{ message: string; count: number }> {
    return fetchWithAuth("/api/performance/import", {
      method: "POST",
      body: JSON.stringify({ tanggal, rows })
    });
  },

  async deleteBatch(tanggal: string, kodeCabang?: string): Promise<{ message: string }> {
    return fetchWithAuth("/api/performance/delete-batch", {
      method: "POST",
      body: JSON.stringify({ tanggal, kodeCabang })
    });
  },

  async resetDatabase(): Promise<{ message: string; performanceCount: number }> {
    return fetchWithAuth("/api/performance/reset", {
      method: "POST"
    });
  }
};
