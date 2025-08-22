import { get, post, patch, del } from './index';

export const getPrepSchedule = async (params: Record<string, any> = {}) => {
  const query = new URLSearchParams(params).toString();
  return get(`/prep/schedule${query ? `?${query}` : ''}`);
};

export const createPrepSchedule = async (prepData: any) => post('/prep/schedule', prepData);
export const deletePrepSchedule = async (prep_id: string | number) => {
  if (!prep_id) throw new Error('prep_id is required to delete prep schedule.');
  return del(`/prep/schedule/${prep_id}`);
};

export const updatePrepSchedule = async (prepData: any) => {
  if (!prepData?.prep_id) throw new Error('prep_id is required to update prep schedule.');
  return patch(`/prep/schedule/${prepData.prep_id}`, prepData);
};

export const getBatchRecipes = async () => get('/prep/view_batch_recipes');
export const createBatchRecipe = async (batchData: any) =>
  post('/prep/batch_recipes/create', batchData);
export const updateBatchRecipe = async (batch_recipe_id: string | number, updateData: any) => {
  if (!batch_recipe_id) throw new Error('batch_recipe_id is required to update batch recipe.');
  return patch(`/prep/batch_recipes/${batch_recipe_id}`, updateData);
};
export const getIngredients = async () => get('/prep/get_ingredients');
