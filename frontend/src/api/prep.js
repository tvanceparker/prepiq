import { get, post, patch, del } from "./index.ts";

// Fetch prep schedule with optional query params (e.g., prep_date)
export const getPrepSchedule = async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await get(`/prep/schedule${query ? `?${query}` : ""}`);
};

// Create a new prep schedule (send prep data as body)
export const createPrepSchedule = async (prepData) => {
    return await post("/prep/schedule", prepData);
};

// Delete a prep schedule by prep_id
export const deletePrepSchedule = async (prep_id) => {
    if (!prep_id) {
        throw new Error("prep_id is required to delete prep schedule.");
    }
    return await del(`/prep/schedule/${prep_id}`);
};

// Update prep schedule by prep_id (send updated fields)
export const updatePrepSchedule = async (prepData) => {
    if (!prepData?.prep_id) {
        throw new Error("prep_id is required to update prep schedule.");
    }
    return await patch(`/prep/schedule/${prepData.prep_id}`, prepData);
};

// Fetch batch recipes (no params)
export const getBatchRecipes = async () => {
    return await get("/prep/view_batch_recipes");
};


// Create a new batch recipe
export const createBatchRecipe = async (batchData) => {
    return await post("/prep/batch_recipes/create", batchData);
};

// Update an existing batch recipe
export const updateBatchRecipe = async (batch_recipe_id, updateData) => {
    if (!batch_recipe_id) {
        throw new Error("batch_recipe_id is required to update batch recipe.");
    }
    return await patch(`/prep/batch_recipes/${batch_recipe_id}`, updateData);
};

// Fetch all available ingredients
export const getIngredients = async () => {
    return await get("/prep/get_ingredients");
};