import { useEffect, useMemo, useState } from 'react';
import {
  getRecipesWithIngredients,
  updateRecipeWithIngredients,
  createRecipeWithIngredients,
  deleteRecipe,
  getAllIngredients,
  getAllBatchRecipes,
  getRecipeUsage,
} from '../../../api/menu';
import { showSuccess, showError } from '../../../utils/toast';

const blankForm = () => ({
  recipe_name: '',
  instructions: '',
  ingredients: [],
});

export default function useRecipeForm() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);
  const [editorMode, setEditorMode] = useState('view');
  const [allIngredients, setAllIngredients] = useState([]);
  const [allBatchRecipes, setAllBatchRecipes] = useState([]);
  const [formData, setFormData] = useState(blankForm());
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [usage, setUsage] = useState(null);

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const data = await getRecipesWithIngredients();
      setRecipes(data);
    } catch {
      showError('Failed to load recipes');
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
      showError('Failed to load ingredients or batch recipes');
    }
  };

  useEffect(() => {
    fetchRecipes();
    fetchIngredientsAndBatches();
  }, []);

  useEffect(() => {
    if (selectedRecipeId || editorMode === 'create') {
      return;
    }

    if (recipes.length > 0) {
      setSelectedRecipeId(recipes[0].recipe_id);
    }
  }, [recipes, selectedRecipeId, editorMode]);

  const selectedRecipe = useMemo(
    () => recipes.find(recipe => recipe.recipe_id === selectedRecipeId) || null,
    [recipes, selectedRecipeId]
  );

  useEffect(() => {
    let cancelled = false;

    const loadUsage = async () => {
      if (!selectedRecipeId || editorMode === 'create') {
        setUsage(null);
        return;
      }

      try {
        const data = await getRecipeUsage(selectedRecipeId);
        if (!cancelled) {
          setUsage(data);
        }
      } catch {
        if (!cancelled) {
          setUsage(null);
        }
      }
    };

    loadUsage();

    return () => {
      cancelled = true;
    };
  }, [selectedRecipeId, editorMode]);

  const loadFormFromRecipe = recipe => {
    setFormData({
      recipe_name: recipe?.name || '',
      instructions: recipe?.description || '',
      ingredients: (recipe?.ingredients || []).map(ingredient => ({
        name: ingredient.name || '',
        quantity: ingredient.quantity != null ? String(ingredient.quantity) : '',
        unit: ingredient.unit || '',
        type: ingredient.type || 'ingredient',
        reference_id: ingredient.reference_id != null ? String(ingredient.reference_id) : '',
      })),
    });
  };

  const startCreate = () => {
    setEditorMode('create');
    setFormData(blankForm());
  };

  const startEdit = recipe => {
    const nextRecipe = recipe || selectedRecipe;
    if (!nextRecipe) {
      return;
    }
    setSelectedRecipeId(nextRecipe.recipe_id);
    setEditorMode('edit');
    loadFormFromRecipe(nextRecipe);
  };

  const cancelEditing = () => {
    setEditorMode('view');
    if (selectedRecipe) {
      loadFormFromRecipe(selectedRecipe);
    } else {
      setFormData(blankForm());
    }
  };

  const selectRecipe = recipeId => {
    setSelectedRecipeId(recipeId);
    setEditorMode('view');
  };

  const addIngredientRow = () => {
    setFormData(current => ({
      ...current,
      ingredients: [
        ...current.ingredients,
        { name: '', quantity: '', unit: '', type: 'ingredient', reference_id: '' },
      ],
    }));
  };

  const updateIngredientRow = (index, field, value) => {
    setFormData(current => ({
      ...current,
      ingredients: current.ingredients.map((ingredient, ingredientIndex) => {
        if (ingredientIndex !== index) {
          return ingredient;
        }

        if (field === 'type') {
          return { ...ingredient, type: value, reference_id: '', name: '', unit: '' };
        }

        return { ...ingredient, [field]: value };
      }),
    }));
  };

  const applyReferenceOption = (index, option) => {
    if (!option) {
      updateIngredientRow(index, 'reference_id', '');
      updateIngredientRow(index, 'name', '');
      return;
    }

    setFormData(current => ({
      ...current,
      ingredients: current.ingredients.map((ingredient, ingredientIndex) =>
        ingredientIndex === index
          ? {
              ...ingredient,
              name: option.name,
              type: option.type,
              reference_id: String(option.id),
              unit: ingredient.unit || option.unit || '',
            }
          : ingredient
      ),
    }));
  };

  const removeIngredientRow = index => {
    setFormData(current => ({
      ...current,
      ingredients: current.ingredients.filter((_, ingredientIndex) => ingredientIndex !== index),
    }));
  };

  const saveRecipe = async () => {
    if (!formData.recipe_name.trim()) {
      return showError('Recipe name is required');
    }

    const payload = {
      name: formData.recipe_name.trim(),
      description: formData.instructions.trim(),
      ingredients: formData.ingredients.map(ingredient => ({
        quantity: parseFloat(ingredient.quantity) || 0,
        unit: ingredient.unit,
        type: ingredient.type,
        reference_id: parseInt(ingredient.reference_id, 10),
      })),
    };

    try {
      setSaving(true);
      if (editorMode === 'edit' && selectedRecipeId) {
        await updateRecipeWithIngredients(selectedRecipeId, payload);
        showSuccess('Recipe updated!');
      } else {
        const created = await createRecipeWithIngredients(payload);
        if (created?.recipe_id) {
          setSelectedRecipeId(created.recipe_id);
        }
        showSuccess('Recipe created!');
      }
      await fetchRecipes();
      setEditorMode('view');
    } catch {
      showError('Failed to save recipe');
    } finally {
      setSaving(false);
    }
  };

  const archiveRecipe = async () => {
    if (!selectedRecipeId) return;

    try {
      await deleteRecipe(selectedRecipeId);
      showSuccess('Recipe archived.');
      await fetchRecipes();
      setEditorMode('view');
    } catch {
      showError('Failed to delete recipe');
    }
  };

  const filteredRecipes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return [...recipes]
      .filter(recipe => {
        const matchesSearch =
          !query ||
          recipe.name?.toLowerCase().includes(query) ||
          recipe.description?.toLowerCase().includes(query) ||
          (recipe.ingredients || []).some(ingredient =>
            ingredient.name?.toLowerCase().includes(query)
          );

        const matchesType =
          typeFilter === 'all' ||
          (recipe.ingredients || []).some(ingredient => ingredient.type === typeFilter);

        return matchesSearch && matchesType;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [recipes, searchQuery, typeFilter]);

  const stats = useMemo(() => {
    const totalComponents = recipes.reduce(
      (count, recipe) => count + (recipe.ingredients?.length || 0),
      0
    );
    const nestedRecipeCount = recipes.filter(recipe =>
      (recipe.ingredients || []).some(ingredient => ingredient.type === 'recipe')
    ).length;
    const batchBackedCount = recipes.filter(recipe =>
      (recipe.ingredients || []).some(ingredient => ingredient.type === 'batch')
    ).length;

    return {
      totalRecipes: recipes.length,
      nestedRecipeCount,
      batchBackedCount,
      totalComponents,
    };
  }, [recipes]);

  const referenceOptions = useMemo(() => {
    const activeRecipeId = editorMode === 'edit' ? selectedRecipeId : null;

    return [
      ...allIngredients.map(ingredient => ({
        id: ingredient.ingredient_id,
        name: ingredient.name,
        unit: ingredient.unit,
        type: 'ingredient',
        subtitle: ingredient.category || 'Ingredient',
      })),
      ...allBatchRecipes.map(batch => ({
        id: batch.batch_recipe_id,
        name: batch.name,
        unit: batch.yield_unit,
        type: 'batch',
        subtitle: batch.description || 'Prep batch',
      })),
      ...recipes
        .filter(recipe => recipe.recipe_id !== activeRecipeId)
        .map(recipe => ({
          id: recipe.recipe_id,
          name: recipe.name,
          unit: null,
          type: 'recipe',
          subtitle: recipe.description || 'Nested recipe',
        })),
    ];
  }, [allIngredients, allBatchRecipes, recipes, editorMode, selectedRecipeId]);

  return {
    recipes: filteredRecipes,
    allRecipes: recipes,
    formData,
    setFormData,
    selectedRecipe,
    selectedRecipeId,
    setSelectedRecipeId: selectRecipe,
    saveRecipe,
    archiveRecipe,
    loading,
    saving,
    fetchRecipes,
    allIngredients,
    allBatchRecipes,
    referenceOptions,
    stats,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    usage,
    editorMode,
    isEditing: editorMode !== 'view',
    startCreate,
    startEdit,
    cancelEditing,
    addIngredientRow,
    updateIngredientRow,
    applyReferenceOption,
    removeIngredientRow,
  };
}
