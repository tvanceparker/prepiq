import { get, post, patch, del } from './index';

// ====================== Types ======================

export interface PrepLogParams {
  start_date?: string;
  end_date?: string;
  status?: string;
  batch_recipe_id?: number;
}

export interface PrepScheduleParams {
  prep_date?: string;
  status?: string;
}

export interface PrepScheduleData {
  prep_id?: number;
  batch_recipe_id: number;
  scheduled_date: string;
  quantity_to_prep: number;
  assigned_employee_id?: number;
  status?: string;
}

export interface BatchRecipeData {
  batch_recipe_id?: number;
  batch_name: string;
  description?: string;
  yield_quantity: number;
  yield_unit: string;
  shelf_life_days?: number;
  ingredients?: Array<{
    ingredient_id: number;
    quantity_needed: number;
  }>;
}

export interface WasteLogParams {
  start_date?: string;
  end_date?: string;
  item_type?: string;
}

export interface WasteLogData {
  ingredient_id?: number;
  batch_recipe_id?: number;
  quantity_wasted: number;
  unit: string;
  waste_type: string;
  reason: string;
  notes?: string;
}

// ====================== Prep Logs ======================

/**
 * Fetch prep logs (historical completed prep schedules) with optional filters
 */
export const getPrepLogs = async (params: PrepLogParams = {}): Promise<any> => {
  const query = new URLSearchParams(params as any).toString();
  return await get(`/prep/logs${query ? `?${query}` : ''}`);
};

// ====================== Prep Schedule ======================

/**
 * Fetch prep schedule with optional query params (e.g., prep_date)
 */
export const getPrepSchedule = async (params: PrepScheduleParams = {}): Promise<any> => {
  const query = new URLSearchParams(params as any).toString();
  return await get(`/prep/schedule${query ? `?${query}` : ''}`);
};

/**
 * Create a new prep schedule
 */
export const createPrepSchedule = async (prepData: PrepScheduleData): Promise<any> => {
  return await post('/prep/schedule', prepData);
};

/**
 * Delete a prep schedule by prep_id
 */
export const deletePrepSchedule = async (prep_id: number): Promise<any> => {
  if (!prep_id) {
    throw new Error('prep_id is required to delete prep schedule.');
  }
  return await del(`/prep/schedule/${prep_id}`);
};

/**
 * Update prep schedule by prep_id
 */
export const updatePrepSchedule = async (prepData: PrepScheduleData): Promise<any> => {
  if (!prepData?.prep_id) {
    throw new Error('prep_id is required to update prep schedule.');
  }
  return await patch(`/prep/schedule/${prepData.prep_id}`, prepData);
};

// ====================== Batch Recipes ======================

/**
 * Fetch all batch recipes
 */
export const getBatchRecipes = async (): Promise<any> => {
  return await get('/prep/view_batch_recipes');
};

/**
 * Create a new batch recipe
 */
export const createBatchRecipe = async (batchData: BatchRecipeData): Promise<any> => {
  return await post('/prep/batch_recipes/create', batchData);
};

/**
 * Update an existing batch recipe
 */
export const updateBatchRecipe = async (
  batch_recipe_id: number,
  updateData: Partial<BatchRecipeData>
): Promise<any> => {
  if (!batch_recipe_id) {
    throw new Error('batch_recipe_id is required to update batch recipe.');
  }
  return await patch(`/prep/batch_recipes/${batch_recipe_id}`, updateData);
};

// ====================== Ingredients ======================

/**
 * Fetch all available ingredients
 */
export const getIngredients = async (): Promise<any> => {
  return await get('/prep/get_ingredients');
};

// ====================== Waste Logs ======================

/**
 * Fetch waste logs with optional filters
 */
export const getWasteLogs = async (params: WasteLogParams = {}): Promise<any> => {
  const query = new URLSearchParams(params as any).toString();
  return await get(`/prep/waste-logs${query ? `?${query}` : ''}`);
};

/**
 * Create a manual waste log entry
 */
export const createWasteLog = async (wasteData: WasteLogData): Promise<any> => {
  return await post('/prep/waste-logs', wasteData);
};
