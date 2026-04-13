import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  InputAdornment,
  Snackbar,
  Stack,
  TextField,
  Typography,
  type AlertColor,
} from '@mui/material';
import { Search } from '@mui/icons-material';
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
  const { data: recipes = [], refetch, loading } = useBatchRecipes();
  const { data: ingredients = [], loading: ingredientsLoading } = useIngredients();
  const { create } = useCreateBatchRecipe();
  const { update } = useUpdateBatchRecipe();

  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(blankForm());
  const [editMode, setEditMode] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [newForm, setNewForm] = useState(blankForm());
  const [search, setSearch] = useState('');

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
      if (recipes.length > 0) {
        setSelectedId(recipes[0].batch_recipe_id);
      }
      setForm(blankForm());
      setEditMode(false);
    }
    const selected = recipes.find(r => r.batch_recipe_id === selectedId);
    if (selected) {
      setForm({
        ...selected,
        ingredients: selected.ingredients.map(
          ({ ingredient_id, ingredient_type, quantity_used, reference_id, unit }) => ({
            ingredient_id,
            ingredient_type,
            quantity_used,
            reference_id,
            unit,
          })
        ),
      });
      setEditMode(false);
    }
  }, [selectedId, recipes]);

  const filteredRecipes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return recipes;
    }

    return recipes.filter(recipe => {
      return [recipe.name, recipe.description, recipe.yield_unit]
        .filter(Boolean)
        .some(value => value.toLowerCase().includes(query));
    });
  }, [recipes, search]);

  const stats = useMemo(() => {
    const totalComponents = recipes.reduce(
      (count, recipe) => count + (recipe.ingredients?.length || 0),
      0
    );

    return {
      totalRecipes: recipes.length,
      totalComponents,
    };
  }, [recipes]);

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
    <Box sx={{ px: { xs: 2, md: 4 }, py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Batch Recipes
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Prep-management view aligned with the refreshed Menu & Recipes batch workspace.
        </Typography>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Total Batches
              </Typography>
              <Typography variant="h5" fontWeight={600}>
                {stats.totalRecipes}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Components
              </Typography>
              <Typography variant="h5" fontWeight={600}>
                {stats.totalComponents}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {loading || ingredientsLoading ? (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <CircularProgress />
          <Typography mt={2}>Loading batch recipes...</Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4} lg={3.5}>
            <Card sx={{ borderRadius: 4, mb: 3 }}>
              <CardContent>
                <TextField
                  fullWidth
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Search batch recipes"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </CardContent>
            </Card>

            <Box sx={{ flex: 1, maxWidth: { md: 380 } }}>
          <BatchRecipeList
            recipes={filteredRecipes}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onNew={() => setOpenModal(true)}
          />
            </Box>
          </Grid>

          <Grid item xs={12} md={8} lg={8.5}>
          <BatchRecipeDetail
            recipeForm={form}
            setRecipeForm={setForm}
            ingredients={ingredients}
            editMode={editMode}
            setEditMode={setEditMode}
            onUpdate={handleUpdateSubmit}
          />
          </Grid>
        </Grid>
      )}

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
