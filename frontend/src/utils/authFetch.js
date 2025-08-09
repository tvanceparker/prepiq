// src/utils/authFetch.js
import { BASE_URL } from "../api/config";

export async function authFetch(url, options = {}) {
    const token = localStorage.getItem("token");

    const res = await fetch(url, {
        ...options,
        headers: {
            ...(options.headers || {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
    });

    if (res.status === 401) {
        // Try to refresh token
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
            method: "POST",
            credentials: "include", // Send cookies!
        });

        if (refreshRes.ok) {
            const data = await refreshRes.json();
            localStorage.setItem("token", data.access_token);

            // Retry original request
            const retryRes = await fetch(url, {
                ...options,
                headers: {
                    ...(options.headers || {}),
                    Authorization: `Bearer ${data.access_token}`,
                },
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
