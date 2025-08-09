// src/utils/authFetch.ts
import { BASE_URL } from "../api/config";

export async function authFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token");

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>) || {},
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  if (res.status === 401) {
    // Try to refresh token
    const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include", // Send cookies!
    });

    if (refreshRes.ok) {
      const data = (await refreshRes.json()) as { access_token: string };
      localStorage.setItem("token", data.access_token);

      // Retry original request
      const retryHeaders: Record<string, string> = {
        ...(options.headers as Record<string, string>) || {},
        Authorization: `Bearer ${data.access_token}`,
      };

      const retryRes = await fetch(url, {
        ...options,
        headers: retryHeaders,
        credentials: "include",
      });
      return retryRes;
    } else {
      // Refresh failed — force logout
      localStorage.clear();
      window.location.href = "/login";
    }
  }

  return res;
}
