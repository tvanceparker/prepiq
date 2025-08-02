import { useState, useEffect, useCallback } from "react";
import {
    getBatchRecipes,
    getIngredients,
    createBatchRecipe,
    updateBatchRecipe,
} from "../../../api/prep";

// Hook to fetch all batch recipes
export function useBatchRecipes() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchBatchRecipes = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getBatchRecipes();
            setData(res);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBatchRecipes();
    }, [fetchBatchRecipes]);

    return { data, loading, error, refetch: fetchBatchRecipes };
}

// Hook to fetch all ingredients (for use in batch recipe forms)
export function useIngredients() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchIngredients = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getIngredients();
            setData(res);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchIngredients();
    }, [fetchIngredients]);

    return { data, loading, error, refetch: fetchIngredients };
}

// Hook to create a batch recipe
export function useCreateBatchRecipe() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const create = useCallback(async (batchData) => {
        setLoading(true);
        setError(null);
        try {
            const res = await createBatchRecipe(batchData);
            return res;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return { create, loading, error };
}

// Hook to update a batch recipe
export function useUpdateBatchRecipe() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const update = useCallback(async (batch_recipe_id, updateData) => {
        setLoading(true);
        setError(null);
        try {
            const res = await updateBatchRecipe(batch_recipe_id, updateData);
            return res;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return { update, loading, error };
}
