import { get, post, patch, del } from './index';
import type {
  PrepScheduleParams,
  PrepScheduleItem,
  PrepScheduleCreate,
  PrepScheduleUpdate,
  PrepLogParams,
  PrepLog,
  WasteLogParams,
  WasteLog,
  WasteLogCreate,
  BatchRecipeData,
} from '../interfaces/prep';

// =============================================================================
// Prep Schedule
// =============================================================================

export const getPrepSchedule = async (
  params: PrepScheduleParams = {}
): Promise<PrepScheduleItem[]> => {
  const query = new URLSearchParams(params as any).toString();
  const rows = await get<any[]>(`/prep/schedule${query ? `?${query}` : ''}`);
  return rows.map(row => ({ ...row, scheduled_date: row.prep_date, quantity_to_prep: row.quantity_needed }));
};

export const createPrepSchedule = async (
  prepData: PrepScheduleCreate
): Promise<PrepScheduleItem> => {
  return post<PrepScheduleItem>('/prep/schedule', { batch_recipe_id: prepData.batch_recipe_id,
    prep_date: prepData.scheduled_date, quantity_needed: prepData.quantity_to_prep,
    assigned_employee_id: prepData.assigned_employee_id });
};

export const updatePrepSchedule = async (
  prepData: PrepScheduleUpdate
): Promise<PrepScheduleItem> => {
  if (!prepData?.prep_id) {
    throw new Error('prep_id is required to update prep schedule.');
  }
  return patch<PrepScheduleItem>(`/prep/schedule/${prepData.prep_id}`, prepData);
};

export const deletePrepSchedule = async (prep_id: number): Promise<void> => {
  if (!prep_id) {
    throw new Error('prep_id is required to delete prep schedule.');
  }
  return del<void>(`/prep/schedule/${prep_id}`);
};

export const markPrepComplete = async (
  prep_id: number,
  quantity_prepped: number
): Promise<PrepScheduleItem> => {
  return patch<PrepScheduleItem>(`/prep/schedule/${prep_id}`, {
    status: 'completed',
    quantity_prepped,
  });
};

// =============================================================================
// Prep Logs
// =============================================================================

export const getPrepLogs = async (params: PrepLogParams = {}): Promise<PrepLog[]> => {
  const query = new URLSearchParams(params as any).toString();
  return get<PrepLog[]>(`/prep/logs${query ? `?${query}` : ''}`);
};

// =============================================================================
// Batch Recipes
// =============================================================================

export const getBatchRecipes = async (): Promise<any[]> => {
  return get<any[]>('/prep/view_batch_recipes');
};

export const createBatchRecipe = async (batchData: BatchRecipeData): Promise<any> => {
  return post<any>('/prep/batch_recipes/create', batchData);
};

export const updateBatchRecipe = async (
  batch_recipe_id: number,
  updateData: Partial<BatchRecipeData>
): Promise<any> => {
  if (!batch_recipe_id) {
    throw new Error('batch_recipe_id is required to update batch recipe.');
  }
  return patch<any>(`/prep/batch_recipes/${batch_recipe_id}`, updateData);
};

export const deleteBatchRecipe = async (batch_recipe_id: number): Promise<void> => {
  if (!batch_recipe_id) {
    throw new Error('batch_recipe_id is required to delete batch recipe.');
  }
  return del<void>(`/prep/batch_recipes/${batch_recipe_id}`);
};

// =============================================================================
// Ingredients (for prep forms)
// =============================================================================

export const getIngredients = async (): Promise<any[]> => {
  return get<any[]>('/prep/get_ingredients');
};

// =============================================================================
// Waste Logs
// =============================================================================

export const getWasteLogs = async (params: WasteLogParams = {}): Promise<WasteLog[]> => {
  const query = new URLSearchParams(params as any).toString();
  const rows = await get<WasteLog[]>(`/prep/waste-logs${query ? `?${query}` : ''}`);
  return rows.map(row => ({ ...row, waste_log_id: row.usage_id, created_at: row.waste_date }));
};

export const createWasteLog = async (wasteData: WasteLogCreate): Promise<{report_id: number; request_key: string; message: string}> => {
  return post<{report_id: number; request_key: string; message: string}>('/prep/waste-logs', wasteData);
};


export const getPrepRecommendations = async (): Promise<import('../interfaces/prep').PrepRecommendations> =>
  get<import('../interfaces/prep').PrepRecommendations>('/prep/recommendations');
