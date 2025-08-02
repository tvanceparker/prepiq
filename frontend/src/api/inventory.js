import { get, patch, post } from "./index.ts";

// Fetch all inventory (summary)
export const fetchAllInventory = async () => {
    return await get("/inventory/view");
};

// Fetch inventory details by ID
export const fetchInventoryDetails = async (inventoryId) => {
    return await get(`/inventory/details/${inventoryId}`);
};

// ✅ Get lot info (supplier, packaging, etc.)
export const fetchLotInfo = async (lotId) => {
    return await get(`/inventory/lot-info/${lotId}`);
};

// ✅ Get usage logs (used)
export const fetchUsedUsageLogs = async (lotId) => {
    return await get(`/inventory/used-usage-logs/${lotId}`);
};

// ✅ Get usage logs (wasted)
export const fetchWastedUsageLogs = async (lotId) => {
    return await get(`/inventory/wasted-usage-logs/${lotId}`);
};

export const fetchAllSuppliers = async () => {
    return await get("/inventory/suppliers");
};

// Update supplier info (patch request with supplier_id and update data)
export const updateSupplier = async (supplierData) => {
    return await patch("/inventory/update-supplier", supplierData);
};

export const updateIngredientSupplier = async (ingredientSupplierData) => {
    return await patch("/inventory/update-ingredient-supplier", ingredientSupplierData);
}

export const createSupplier = async (supplierData) => {
    return await post("/inventory/create-supplier", supplierData);
}

export const createIngredientSupplier = async (supplier_id, ingredientSupplierData) => {
    return await post(`/inventory/create-ingredient-supplier/${supplier_id}`, ingredientSupplierData);
};