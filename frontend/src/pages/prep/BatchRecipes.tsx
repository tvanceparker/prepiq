import React, { useState, useEffect } from 'react';
import { Box, Typography, Snackbar, Alert, type AlertColor } from '@mui/material';
import BatchRecipeList from './components/BatchRecipeList';
import BatchRecipeDetail from './components/BatchRecipeDetail';
import BatchRecipeModal from './components/BatchRecipeModal';

import {
  useBatchRecipes,
  useIngredients,
  useCreateBatchRecipe,
  useUpdateBatchRecipe,
} from './hooks/useBatchRecipes';

const blankForm = () => ({
  name: '',
  description: '',
  yield_quantity: '',
  yield_unit: '',
  estimated_prep_time_minutes: '',
  shelf_life_days: '',
  ingredients: [],
});

export default function BatchRecipes() {
  const { data: recipes = [], refetch } = useBatchRecipes();
  const { data: ingredients = [] } = useIngredients();
  const { create } = useCreateBatchRecipe();
  const { update } = useUpdateBatchRecipe();

  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(blankForm());
  const [editMode, setEditMode] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [newForm, setNewForm] = useState(blankForm());

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: AlertColor;
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // When selection changes, update form and disable editMode
  useEffect(() => {
    if (!selectedId) {
      setForm(blankForm());
      setEditMode(false);
      return;
    }
    const selected = recipes.find(r => r.batch_recipe_id === selectedId);
    if (selected) {
      setForm({
        ...selected,
        ingredients: selected.ingredients.map(({ ingredient_id, quantity_used, unit }) => ({
          ingredient_id,
          quantity_used,
          unit,
        })),
      });
      setEditMode(false);
    }
  }, [selectedId, recipes]);

  const showSnackbar = (message: string, severity: AlertColor = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleUpdateSubmit = async () => {
    try {
      await update(selectedId, form);
      showSnackbar('Batch recipe updated!');
      refetch();
      setEditMode(false);
    } catch {
      showSnackbar('Update failed', 'error');
    }
  };

  const handleCreateSubmit = async () => {
    try {
      await create(newForm);
      showSnackbar('Batch recipe created!');
      setOpenModal(false);
      setNewForm(blankForm());
      refetch();
    } catch {
      showSnackbar('Creation failed', 'error');
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        Batch Recipes
      </Typography>

      <Box sx={{ display: 'flex', gap: 3 }}>
        <Box sx={{ flex: 1, maxWidth: 300 }}>
          <BatchRecipeList
            recipes={recipes}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onNew={() => setOpenModal(true)}
          />
        </Box>

        <Box sx={{ flex: 2 }}>
          <BatchRecipeDetail
            recipeForm={form}
            setRecipeForm={setForm}
            ingredients={ingredients}
            editMode={editMode}
            setEditMode={setEditMode}
            onUpdate={handleUpdateSubmit}
          />
        </Box>
      </Box>

      <BatchRecipeModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        ingredients={ingredients}
        form={newForm}
        setForm={setNewForm}
        onCreate={handleCreateSubmit}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(s => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
