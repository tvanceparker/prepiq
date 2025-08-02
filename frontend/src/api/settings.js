// src/api/settings.js
import { get, put, post } from "./index.ts";

// Restaurant Settings
export const getRestaurantSettings = () => get("/settings/restaurant_settings");

export const updateRestaurantSettings = (data) =>
    put("/settings/restaurant_settings", data);

// Remove User Preferences get — replaced by getAccountInfo
export const updateUserPreferences = (data) =>
    put("/settings/preferences", data);

// New: Get full Account Info (includes preferences, name, role, email, phone, restaurant_name)
export const getAccountInfo = () => get("/settings/account-info");

// Update Email (requires currentPassword for confirmation)
export const updateEmail = ({ currentPassword, newEmail }) =>
    post("/settings/change_email", { current_password: currentPassword, new_email: newEmail });

// Update Phone (requires currentPassword)
export const updatePhone = ({ currentPassword, newPhone }) =>
    post("/settings/change_phone", { current_password: currentPassword, new_phone: newPhone });

// Change Password (requires currentPassword)
export const changePassword = ({ currentPassword, newPassword }) =>
    post("/settings/change_password", { current_password: currentPassword, new_password: newPassword });
