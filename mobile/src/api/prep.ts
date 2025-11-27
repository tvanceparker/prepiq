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
  return get<PrepScheduleItem[]>(`/prep/schedule${query ? `?${query}` : ''}`);
};

export const createPrepSchedule = async (
  prepData: PrepScheduleCreate
): Promise<PrepScheduleItem> => {
  return post<PrepScheduleItem>('/prep/schedule', prepData);
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
  return get<WasteLog[]>(`/prep/waste-logs${query ? `?${query}` : ''}`);
};

export const createWasteLog = async (wasteData: WasteLogCreate): Promise<WasteLog> => {
  return post<WasteLog>('/prep/waste-logs', wasteData);
};
