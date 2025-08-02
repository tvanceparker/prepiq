import { useState, useCallback } from "react";
import {
    fetchAllSuppliers,
    updateSupplier,
    updateIngredientSupplier,
    createSupplier,
    createIngredientSupplier,
} from "../../../api/inventory";

export const useSupplierForm = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch all suppliers
    const loadSuppliers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchAllSuppliers();
            if (data.success) {
                setSuppliers(data.data);
            } else {
                setError(data.message || "Failed to load suppliers");
            }
        } catch (err) {
            setError(err.detail || err.message || "Failed to load suppliers");
        } finally {
            setLoading(false);
        }
    }, []);

    // Update a supplier
    const saveSupplier = useCallback(async (supplierUpdatePayload) => {
        setLoading(true);
        setError(null);
        try {
            const result = await updateSupplier(supplierUpdatePayload);
            if (result.detail) {
                await loadSuppliers();
                return { success: true, message: result.detail };
            } else {
                setError("Failed to update supplier");
                return { success: false, message: "Failed to update supplier" };
            }
        } catch (err) {
            setError(err.detail || err.message || "Failed to update supplier");
            return { success: false, message: err.detail || err.message };
        } finally {
            setLoading(false);
        }
    }, [loadSuppliers]);

    // Create a new supplier
    const addSupplier = useCallback(async (supplierPayload) => {
        setLoading(true);
        setError(null);
        try {
            const result = await createSupplier(supplierPayload);
            if (result.detail) {
                await loadSuppliers();
                return { success: true, message: result.detail };
            } else {
                setError("Failed to create supplier");
                return { success: false, message: "Failed to create supplier" };
            }
        } catch (err) {
            setError(err.detail || err.message || "Failed to create supplier");
            return { success: false, message: err.detail || err.message };
        } finally {
            setLoading(false);
        }
    }, [loadSuppliers]);

    // Update ingredient-supplier entry
    const saveIngredientSupplier = useCallback(async (ingredientSupplierPayload) => {
        setLoading(true);
        setError(null);
        try {
            const result = await updateIngredientSupplier(ingredientSupplierPayload);
            if (result.detail) {
                return { success: true, message: result.detail };
            } else {
                setError("Failed to update ingredient-supplier");
                return { success: false, message: "Failed to update ingredient-supplier" };
            }
        } catch (err) {
            setError(err.detail || err.message || "Failed to update ingredient-supplier");
            return { success: false, message: err.detail || err.message };
        } finally {
            setLoading(false);
        }
    }, []);

    // Create new ingredient-supplier for a given supplier
    const addIngredientSupplier = useCallback(async (supplierId, ingredientSupplierPayload) => {
        setLoading(true);
        setError(null);
        try {
            const result = await createIngredientSupplier(supplierId, ingredientSupplierPayload);
            if (result.detail) {
                return { success: true, message: result.detail };
            } else {
                setError("Failed to create ingredient-supplier");
                return { success: false, message: "Failed to create ingredient-supplier" };
            }
        } catch (err) {
            setError(err.detail || err.message || "Failed to create ingredient-supplier");
            return { success: false, message: err.detail || err.message };
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        suppliers,
        loading,
        error,
        loadSuppliers,
        saveSupplier,
        addSupplier,
        saveIngredientSupplier,
        addIngredientSupplier,
    };
};
