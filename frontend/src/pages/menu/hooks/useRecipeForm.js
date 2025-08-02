import { useState, useEffect } from "react";
import {
    getRecipesWithIngredients,
    updateRecipeWithIngredients,
    createRecipeWithIngredients,
    deleteRecipe,
    getAllIngredients,
    getAllBatchRecipes,
} from "../../../api/menu";
import { showSuccess, showError } from "../../../utils/toast";

export default function useRecipeForm() {
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingRecipe, setEditingRecipe] = useState(null);
    const [allIngredients, setAllIngredients] = useState([]);
    const [allBatchRecipes, setAllBatchRecipes] = useState([]);
    const [formData, setFormData] = useState({
        recipe_name: "",
        instructions: "",
        ingredients: [],
    });

    const fetchRecipes = async () => {
        setLoading(true);
        try {
            const data = await getRecipesWithIngredients();
            setRecipes(data);
        } catch {
            showError("Failed to load recipes");
        } finally {
            setLoading(false);
        }
    };

    const fetchIngredientsAndBatches = async () => {
        try {
            const [ingredientsData, batchRecipesData] = await Promise.all([
                getAllIngredients(),
                getAllBatchRecipes(),
            ]);
            setAllIngredients(ingredientsData);
            setAllBatchRecipes(batchRecipesData);
        } catch {
            showError("Failed to load ingredients or batch recipes");
        }
    };

    useEffect(() => {
        fetchRecipes();
        fetchIngredientsAndBatches();
    }, []);

    useEffect(() => {
        if (editingRecipe) {
            setFormData({
                recipe_name: editingRecipe.name || "",
                instructions: editingRecipe.description || "",
                ingredients: (editingRecipe.ingredients || []).map((ing) => ({
                    name: ing.name || "",
                    quantity: ing.quantity || "",
                    unit: ing.unit || "",
                    type: ing.type || "ingredient",
                    reference_id: ing.reference_id || "",
                })),
            });
        } else {
            setFormData({
                recipe_name: "",
                instructions: "",
                ingredients: [],
            });
        }
    }, [editingRecipe]);

    const handleSave = async () => {
        if (!formData.recipe_name.trim()) {
            return showError("Recipe name is required");
        }

        const payload = {
            name: formData.recipe_name.trim(),
            description: formData.instructions.trim(),
            ingredients: formData.ingredients,
        };

        try {
            if (editingRecipe?.recipe_id) {
                await updateRecipeWithIngredients(editingRecipe.recipe_id, payload);
                showSuccess("Recipe updated!");
            } else {
                await createRecipeWithIngredients(payload);
                showSuccess("Recipe created!");
            }
            setEditingRecipe(null);
            fetchRecipes();
        } catch {
            showError("Failed to save recipe");
        }
    };

    const handleDelete = async () => {
        if (!editingRecipe?.recipe_id) return;

        try {
            await deleteRecipe(editingRecipe.recipe_id);
            showSuccess("Recipe deleted.");
            setEditingRecipe(null);
            fetchRecipes();
        } catch {
            showError("Failed to delete recipe");
        }
    };

    return {
        recipes,
        formData,
        setFormData,
        editingRecipe,
        setEditingRecipe,
        handleSave,
        handleDelete,
        loading,
        fetchRecipes,
        allIngredients,
        allBatchRecipes,
    };
}
