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

    // Try to read filename from Content-Disposition header, fall back to default
    const contentDisposition = res.headers.get("content-disposition") || res.headers.get("Content-Disposition");
    // Default filename: use provided defaultDate if available, otherwise today's date
    const defaultFileDate = defaultDate ? defaultDate.split("T")[0] : new Date().toISOString().slice(0, 10);
    let filename = `sale_template_${defaultFileDate}.xlsx`;
    if (contentDisposition) {
        // Examples:
        // Content-Disposition: attachment; filename="sale_template_2025-08-14.xlsx"
        // or with RFC5987 encoding: filename*=UTF-8''sale_template_2025-08-14.xlsx
        const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''([^;\n\r]+)/i);
        const filenameMatch = contentDisposition.match(/filename="?([^";\n\r]+)"?/i);
        if (filenameStarMatch && filenameStarMatch[1]) {
            try {
                filename = decodeURIComponent(filenameStarMatch[1]);
            } catch (e) {
                filename = filenameStarMatch[1];
            }
        } else if (filenameMatch && filenameMatch[1]) {
            filename = filenameMatch[1];
        }
    }

    const blob = await res.blob();
    return { blob, filename };
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

