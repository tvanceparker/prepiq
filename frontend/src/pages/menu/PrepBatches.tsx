import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  InputAdornment,
  Snackbar,
  Stack,
  TextField,
  Typography,
  type AlertColor,
} from '@mui/material';
import { Add, Search } from '@mui/icons-material';
import BatchRecipeList from '../prep/components/BatchRecipeList';
import BatchRecipeDetail from '../prep/components/BatchRecipeDetail';
import BatchRecipeModal from '../prep/components/BatchRecipeModal';
import {
  useBatchRecipes,
  useCreateBatchRecipe,
  useIngredients,
  useUpdateBatchRecipe,
} from '../prep/hooks/useBatchRecipes';

const blankForm = () => ({
  name: '',
  description: '',
  yield_quantity: '',
  yield_unit: '',
  estimated_prep_time_minutes: '',
  shelf_life_days: '',
  ingredients: [],
});

export default function PrepBatches() {
  const { data: recipes = [], refetch } = useBatchRecipes();
  const { data: ingredients = [] } = useIngredients();
  const { create } = useCreateBatchRecipe();
  const { update } = useUpdateBatchRecipe();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState(blankForm());
  const [editMode, setEditMode] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [newForm, setNewForm] = useState(blankForm());
  const [search, setSearch] = useState('');
  const [activeUnit, setActiveUnit] = useState<string>('all');

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: AlertColor;
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const selectedRecipe = useMemo(
    () => recipes.find(r => r.batch_recipe_id === selectedId),
    [recipes, selectedId]
  );

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

  const unitOptions = useMemo(() => {
    const units = new Set<string>();
    recipes.forEach(recipe => {
      if (recipe.yield_unit) units.add(recipe.yield_unit);
    });
    return ['all', ...Array.from(units).sort((a, b) => a.localeCompare(b))];
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return recipes.filter(recipe => {
      const matchesSearch =
        !query ||
        recipe.name?.toLowerCase().includes(query) ||
        recipe.description?.toLowerCase().includes(query);
      const matchesUnit = activeUnit === 'all' || recipe.yield_unit === activeUnit;
      return matchesSearch && matchesUnit;
    });
  }, [recipes, search, activeUnit]);

  const stats = useMemo(() => {
    const totalRecipes = recipes.length;
    const totalIngredients = recipes.reduce(
      (sum, recipe) => sum + (recipe.ingredients?.length || 0),
      0
    );
    const avgPrepTime =
      totalRecipes === 0
        ? 0
        : Math.round(
            recipes.reduce((sum, recipe) => sum + (recipe.estimated_prep_time_minutes || 0), 0) /
              totalRecipes
          );
    const avgShelfLife =
      totalRecipes === 0
        ? 0
        : Math.round(
            recipes.reduce((sum, recipe) => sum + (recipe.shelf_life_days || 0), 0) / totalRecipes
          );
    return { totalRecipes, totalIngredients, avgPrepTime, avgShelfLife };
  }, [recipes]);

  const showSnackbar = (message: string, severity: AlertColor = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleUpdateSubmit = async () => {
    if (!selectedId) return;
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

  const handleResetFilters = () => {
    setSearch('');
    setActiveUnit('all');
  };

  return (
    <Box sx={{ p: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Prep Batches
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Menu planning view for standardized prep batches and yields.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="outlined" onClick={handleResetFilters}>
            Reset Filters
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpenModal(true)}>
            New Batch
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
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
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Ingredients Used
              </Typography>
              <Typography variant="h5" fontWeight={600}>
                {stats.totalIngredients}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Avg Prep Time
              </Typography>
              <Typography variant="h5" fontWeight={600}>
                {stats.avgPrepTime} min
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Avg Shelf Life
              </Typography>
              <Typography variant="h5" fontWeight={600}>
                {stats.avgShelfLife} days
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            <TextField
              fullWidth
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search batches by name or description"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {unitOptions.map(unit => (
                <Chip
                  key={unit}
                  label={unit === 'all' ? 'All Units' : unit}
                  color={unit === activeUnit ? 'primary' : 'default'}
                  variant={unit === activeUnit ? 'filled' : 'outlined'}
                  onClick={() => setActiveUnit(unit)}
                />
              ))}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <BatchRecipeList
            recipes={filteredRecipes}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onNew={() => setOpenModal(true)}
          />
          {filteredRecipes.length === 0 && (
            <Box mt={2} textAlign="center">
              <Typography variant="body2" color="text.secondary">
                No batches match your filters.
              </Typography>
            </Box>
          )}
        </Grid>

        <Grid item xs={12} md={8}>
          <BatchRecipeDetail
            recipeForm={form}
            setRecipeForm={setForm}
            ingredients={ingredients}
            editMode={editMode}
            setEditMode={setEditMode}
            onUpdate={handleUpdateSubmit}
          />

          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Production Notes
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {selectedRecipe ? (
                <Stack spacing={1}>
                  <Typography variant="body2" color="text.secondary">
                    Ingredients: {selectedRecipe.ingredients?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Estimated prep time: {selectedRecipe.estimated_prep_time_minutes || '-'} min
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Shelf life: {selectedRecipe.shelf_life_days || '-'} days
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Yield: {selectedRecipe.yield_quantity} {selectedRecipe.yield_unit}
                  </Typography>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Select a batch to review production notes and yield targets.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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
