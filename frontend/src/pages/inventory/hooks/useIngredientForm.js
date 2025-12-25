import { useState, useEffect } from "react";
import { getIngredientsWithSuppliers, upsertIngredient, deleteIngredient } from "../../../api/menu";

export default function useIngredientForm() {
    const [ingredients, setIngredients] = useState([]);
    const [filteredIngredients, setFilteredIngredients] = useState([]);
    const [selectedIngredient, setSelectedIngredient] = useState(null);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState("");
    const [error, setError] = useState(null);

    const newIngredientTemplate = {
        ingredient_id: null,
        name: "",
        unit: "",
        category: "",
        suppliers: [],
    };

    useEffect(() => {
        setLoading(true);
        getIngredientsWithSuppliers()
            .then((data) => {
                setIngredients(data);
                setFilteredIngredients(data);
                setLoading(false);
            })
            .catch((err) => {
                setError(err.message || "Failed to load ingredients");
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        if (!filter.trim()) {
            setFilteredIngredients(ingredients);
        } else {
            const filtered = ingredients.filter((ing) =>
                ing.name.toLowerCase().includes(filter.toLowerCase())
            );
            setFilteredIngredients(filtered);
        }
    }, [filter, ingredients]);

    const saveIngredient = async (updatedIngredient) => {
        try {
            setLoading(true);
            const saved = await upsertIngredient(updatedIngredient);
            const payload = saved.ingredient || updatedIngredient;
            setIngredients((prev) => {
                const exists = prev.some((ing) => ing.ingredient_id === payload.ingredient_id);
                if (exists) {
                    return prev.map((ing) =>
                        ing.ingredient_id === payload.ingredient_id ? payload : ing
                    );
                }
                return [...prev, payload];
            });
            setSelectedIngredient(payload);
            setLoading(false);
            return saved;
        } catch (err) {
            setError(err.message || "Failed to save ingredient");
            setLoading(false);
            throw err;
        }
    };

    const startNewIngredient = () => {
        setSelectedIngredient({ ...newIngredientTemplate });
    };

    const removeIngredient = async (ingredientId) => {
        try {
            setLoading(true);
            await deleteIngredient(ingredientId);
            setIngredients((prev) => prev.filter((ing) => ing.ingredient_id !== ingredientId));
            setSelectedIngredient(null);
            setLoading(false);
        } catch (err) {
            setError(err.message || "Failed to delete ingredient");
            setLoading(false);
            throw err;
        }
    };


    return {
        ingredients: filteredIngredients,
        selectedIngredient,
        setSelectedIngredient,
        filter,
        setFilter,
        loading,
        error,
        saveIngredient,
        startNewIngredient,
        removeIngredient,
    };
}
