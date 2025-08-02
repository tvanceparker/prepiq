import { get, post, put, del } from "./index.ts";
import { authFetch } from "../utils/authFetch";
import  {BASE_URL}  from "./config";
// Daily Overview
export const getDailyOverview = () => get("/dashboard/daily_overview");

// Menu Items
export const getMenuItems = () => get("/dashboard/list_menu_items");
export const createMenuItem = (data) => post("/dashboard/create_menu_item", data);
export const updateMenuItem = (menuItemId, data) =>
    put(`/dashboard/update/${menuItemId}`, data);
export const deleteMenuItem = (menuItemId) =>
    del(`/dashboard/delete/${menuItemId}`);

// ✅ Upload menu CSV (uses FormData + authFetch)
export const uploadMenuCSV = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await authFetch(`${BASE_URL}/dashboard/upload-csv`, {
        method: "POST",
        body: formData,
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`CSV Upload Error: ${res.status} ${err}`);
    }

    return res.json();
};

// ✅ Download template (GET blob + authFetch)
export const downloadSalesTemplate = async (defaultDate) => {
    let url = `${BASE_URL}/dashboard/sales-upload-template`;
    if (defaultDate) {
        url += `?default_date=${encodeURIComponent(defaultDate)}`;
    }

    const res = await authFetch(url, { method: "GET" });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Download template failed: ${res.status} ${err}`);
    }

    return res.blob();
};

// ✅ Upload sales CSV/XLSX (FormData + authFetch)
// Add this to api/dashboard.js
export const uploadSalesData = async (file, overwrite = false) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("overwrite", overwrite ? "true" : "false");

    const res = await authFetch(
        `${BASE_URL}/dashboard/upload-sales-data`,
        {
            method: "POST",
            body: formData,
        }
    );

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`${res.status}: ${err}`);
    }

    return res.json();
};

