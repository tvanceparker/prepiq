// src/api/auth.js
import { BASE_URL } from "./config";
import { get } from "./index.ts"

export const login = async (username, password) => {
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    const res = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
        credentials: "include", // to receive refresh_token cookie
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Login failed: ${res.status} ${errText}`);
    }

    const data = await res.json();

    // Save access token to localStorage for convenience (still managed by context though)
    if (data.access_token) {
        localStorage.setItem("token", data.access_token);
    }

    // Return the full login response (including preferences)
    return {
        access_token: data.access_token,
        restaurant_id: data.restaurant_id,
        subscription_tier: data.subscription_tier,
        name: data.name,
        employee_id: data.employee_id,
        role_id: data.role_id,
        preferences: data.preferences || {}, // fallback to empty object if missing
    };
};

export const getRolesWithPermissions = () => get("/admin/roles-with-permissions");