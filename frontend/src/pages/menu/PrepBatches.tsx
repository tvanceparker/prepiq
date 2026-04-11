import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  InputAdornment,
  Snackbar,
  Stack,
  TextField,
  Typography,
  type AlertColor,
} from '@mui/material';
import { Add, Inventory2, Schedule, Science, Search } from '@mui/icons-material';
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
  const { data: recipes = [], refetch, loading } = useBatchRecipes();
  const { data: ingredients = [], loading: ingredientsLoading } = useIngredients();
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

  const hasNestedBatches = useMemo(
    () => recipes.filter(recipe => recipe.ingredients?.some(ingredient => ingredient.ingredient_type === 'batch')).length,
    [recipes]
  );

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 4, maxWidth: '1480px', mx: 'auto' }}>
      <Box
        sx={{
          mb: 3,
          p: { xs: 3, md: 4 },
          borderRadius: 4,
          color: 'common.white',
          background:
            'linear-gradient(135deg, rgba(30,41,59,1) 0%, rgba(8,47,73,0.96) 46%, rgba(14,116,144,0.9) 100%)',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent="space-between">
          <Box>
            <Typography variant="overline" sx={{ opacity: 0.82, letterSpacing: 1.6 }}>
              Menu And Recipes
            </Typography>
            <Typography variant="h3" fontWeight={700} sx={{ mt: 0.5 }}>
              Prep Batches
            </Typography>
            <Typography variant="body1" sx={{ mt: 1.5, maxWidth: 720, opacity: 0.92 }}>
              Standardize prep yields, shelf life, and ingredient usage in the same list-detail workflow as the rest of the refreshed Menu & Recipes section.
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ md: 'flex-start' }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpenModal(true)}
              sx={{ bgcolor: 'common.white', color: 'primary.dark', '&:hover': { bgcolor: 'grey.100' } }}
            >
              New Batch
            </Button>
            <Button
              variant="outlined"
              onClick={handleResetFilters}
              sx={{ borderColor: 'rgba(255,255,255,0.35)', color: 'common.white' }}
            >
              Reset Filters
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Total Batches
              </Typography>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h5" fontWeight={600}>
                  {stats.totalRecipes}
                </Typography>
                <Science fontSize="small" color="action" />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Components Used
              </Typography>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h5" fontWeight={600}>
                  {stats.totalIngredients}
                </Typography>
                <Inventory2 fontSize="small" color="action" />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Avg Prep Time
              </Typography>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h5" fontWeight={600}>
                  {stats.avgPrepTime} min
                </Typography>
                <Schedule fontSize="small" color="action" />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Nested Batch Chains
              </Typography>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h5" fontWeight={600}>
                  {hasNestedBatches}
                </Typography>
                <Chip size="small" label="Graph" />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {loading || ingredientsLoading ? (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <CircularProgress />
          <Typography mt={2}>Loading prep batches...</Typography>
        </Box>
      ) : (
        <>
          <Card sx={{ mb: 3, borderRadius: 4 }}>
            <CardContent>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
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
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
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
            <Grid item xs={12} md={4} lg={3.5}>
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

            <Grid item xs={12} md={8} lg={8.5}>
              <Card sx={{ borderRadius: 4 }}>
                <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
                  <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                    <Box>
                      <Typography variant="overline" color="text.secondary">
                        Batch Detail
                      </Typography>
                      <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5 }}>
                        {selectedRecipe?.name || 'Choose a batch'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Review yield, shelf life, and component structure together before editing production details.
                      </Typography>
                    </Box>
                  </Stack>

                  <Divider sx={{ my: 3 }} />

                  <BatchRecipeDetail
                    recipeForm={form}
                    setRecipeForm={setForm}
                    ingredients={ingredients}
                    editMode={editMode}
                    setEditMode={setEditMode}
                    onUpdate={handleUpdateSubmit}
                  />

                  <Card sx={{ mt: 2, borderRadius: 3 }} variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        Production Notes
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      {selectedRecipe ? (
                        <Stack spacing={1}>
                          <Typography variant="body2" color="text.secondary">
                            Components: {selectedRecipe.ingredients?.length || 0}
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
                          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ pt: 1 }}>
                            {(selectedRecipe.used_in_recipes || []).map(recipe => (
                              <Chip key={recipe.recipe_id} label={recipe.recipe_name} variant="outlined" />
                            ))}
                          </Stack>
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Select a batch to review production notes and yield targets.
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
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
