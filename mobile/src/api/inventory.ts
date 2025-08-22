import { get, patch, post } from './index';

export const fetchAllInventory = async () => get('/inventory/view');
export const fetchInventoryDetails = async (inventoryId: string | number) =>
  get(`/inventory/details/${inventoryId}`);
export const fetchLotInfo = async (lotId: string | number) => get(`/inventory/lot-info/${lotId}`);
export const fetchUsedUsageLogs = async (lotId: string | number) =>
  get(`/inventory/used-usage-logs/${lotId}`);
export const fetchWastedUsageLogs = async (lotId: string | number) =>
  get(`/inventory/wasted-usage-logs/${lotId}`);
export const fetchAllSuppliers = async () => get('/inventory/suppliers');
export const updateSupplier = async (supplierData: any) =>
  patch('/inventory/update-supplier', supplierData);
export const updateIngredientSupplier = async (ingredientSupplierData: any) =>
  patch('/inventory/update-ingredient-supplier', ingredientSupplierData);
export const createSupplier = async (supplierData: any) =>
  post('/inventory/create-supplier', supplierData);
export const createIngredientSupplier = async (
  supplier_id: string | number,
  ingredientSupplierData: any
) => post(`/inventory/create-ingredient-supplier/${supplier_id}`, ingredientSupplierData);
