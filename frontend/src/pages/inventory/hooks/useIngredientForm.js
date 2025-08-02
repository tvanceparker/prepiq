import { useState, useEffect } from "react";
import { getIngredientsWithSuppliers, upsertIngredient } from "../../../api/menu";

export default function useIngredientForm() {
    const [ingredients, setIngredients] = useState([]);
    const [filteredIngredients, setFilteredIngredients] = useState([]);
    const [selectedIngredient, setSelectedIngredient] = useState(null);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState("");
    const [error, setError] = useState(null);

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
            setIngredients((prev) =>
                prev.map((ing) =>
                    ing.ingredient_id === saved.ingredient_id ? saved : ing
                )
            );
            setSelectedIngredient(saved);
            setLoading(false);
            return saved;
        } catch (err) {
            setError(err.message || "Failed to save ingredient");
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
    };
}
