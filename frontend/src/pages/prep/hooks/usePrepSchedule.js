import { useState, useEffect, useCallback } from "react";
import {
    getPrepSchedule,
    createPrepSchedule,
    deletePrepSchedule,
    updatePrepSchedule,
    getBatchRecipes,
} from "../../../api/prep";

// Hook to fetch prep schedules (with optional params)
export function usePrepSchedules(params) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const stableParamsKey = params ? JSON.stringify(params) : "";

    const fetchSchedules = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getPrepSchedule(params || {});
            setData(res);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [stableParamsKey]);

    useEffect(() => {
        fetchSchedules();
    }, [fetchSchedules]);

    return { data, loading, error, refetch: fetchSchedules };
}

// Hook to create a prep schedule
export function useCreatePrepSchedule() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const create = useCallback(async (prepData) => {
        setLoading(true);
        setError(null);
        try {
            const res = await createPrepSchedule(prepData);
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

// Hook to update a prep schedule
export function useUpdatePrepSchedule() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const update = useCallback(async (prepData) => {
        setLoading(true);
        setError(null);
        try {
            const res = await updatePrepSchedule(prepData);
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

// Hook to delete a prep schedule
export function useDeletePrepSchedule() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const remove = useCallback(async (prep_id) => {
        setLoading(true);
        setError(null);
        try {
            const res = await deletePrepSchedule(prep_id);
            return res;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return { remove, loading, error };
}

// Hook to fetch batch recipes
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
