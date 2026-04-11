import React from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Add, Delete, Edit, Functions, Search, Schema } from '@mui/icons-material';
import useRecipeForm from './hooks/useRecipeForm';

export default function RecipeEditor() {
  const {
    recipes,
    allRecipes,
    formData,
    setFormData,
    selectedRecipe,
    setSelectedRecipeId,
    saveRecipe,
    archiveRecipe,
    loading,
    saving,
    referenceOptions,
    stats,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    usage,
    isEditing,
    startCreate,
    startEdit,
    cancelEditing,
    addIngredientRow,
    updateIngredientRow,
    applyReferenceOption,
    removeIngredientRow,
  } = useRecipeForm();

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 4, maxWidth: '1480px', mx: 'auto' }}>
      <Box
        sx={{
          mb: 3,
          p: { xs: 3, md: 4 },
          borderRadius: 4,
          color: 'common.white',
          background:
            'linear-gradient(135deg, rgba(120,53,15,1) 0%, rgba(180,83,9,0.96) 52%, rgba(217,119,6,0.9) 100%)',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent="space-between">
          <Box>
            <Typography variant="overline" sx={{ opacity: 0.82, letterSpacing: 1.6 }}>
              Recipe Graph
            </Typography>
            <Typography variant="h3" fontWeight={700} sx={{ mt: 0.5 }}>
              Recipe Editor
            </Typography>
            <Typography variant="body1" sx={{ mt: 1.5, maxWidth: 700, opacity: 0.92 }}>
              Build recipes with raw ingredients, prep batches, and optional nested recipes while
              keeping usage visibility on screen.
            </Typography>
          </Box>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ md: 'flex-start' }}
          >
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={startCreate}
              sx={{
                bgcolor: 'common.white',
                color: 'warning.dark',
                '&:hover': { bgcolor: 'grey.100' },
              }}
            >
              New Recipe
            </Button>
            {selectedRecipe && !isEditing && (
              <Button
                variant="outlined"
                startIcon={<Edit />}
                onClick={() => startEdit(selectedRecipe)}
                sx={{ borderColor: 'rgba(255,255,255,0.4)', color: 'common.white' }}
              >
                Edit Selection
              </Button>
            )}
          </Stack>
        </Stack>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Recipes', value: stats.totalRecipes, icon: <Schema fontSize="small" /> },
          {
            label: 'Nested Recipes',
            value: stats.nestedRecipeCount,
            icon: <Functions fontSize="small" />,
          },
          {
            label: 'Batch-backed',
            value: stats.batchBackedCount,
            icon: <Chip size="small" label="B" />,
          },
          { label: 'Components', value: stats.totalComponents, icon: <Add fontSize="small" /> },
        ].map(stat => (
          <Grid item xs={6} md={3} key={stat.label}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 1 }}
                >
                  <Typography variant="overline" color="text.secondary">
                    {stat.label}
                  </Typography>
                  <Box sx={{ color: 'text.secondary' }}>{stat.icon}</Box>
                </Stack>
                <Typography variant="h4" fontWeight={700}>
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {loading ? (
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress />
          <Typography mt={2}>Loading recipes...</Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4} lg={3.5}>
            <Card sx={{ borderRadius: 4 }}>
              <CardContent>
                <TextField
                  fullWidth
                  placeholder="Search recipes, descriptions, or components"
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  select
                  fullWidth
                  label="Component Filter"
                  value={typeFilter}
                  onChange={event => setTypeFilter(event.target.value)}
                  sx={{ mt: 2 }}
                >
                  <MenuItem value="all">All recipes</MenuItem>
                  <MenuItem value="ingredient">Ingredient based</MenuItem>
                  <MenuItem value="batch">Uses prep batches</MenuItem>
                  <MenuItem value="recipe">Uses nested recipes</MenuItem>
                </TextField>

                <Divider sx={{ my: 2 }} />

                {recipes.length === 0 ? (
                  <Typography color="text.secondary">
                    No recipes match the current filters.
                  </Typography>
                ) : (
                  <List disablePadding sx={{ maxHeight: '62vh', overflowY: 'auto' }}>
                    {recipes.map(recipe => (
                      <ListItemButton
                        key={recipe.recipe_id}
                        selected={selectedRecipe?.recipe_id === recipe.recipe_id}
                        onClick={() => setSelectedRecipeId(recipe.recipe_id)}
                        sx={{
                          mb: 1,
                          borderRadius: 2.5,
                          alignItems: 'flex-start',
                          border: theme => `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        <ListItemText
                          primary={
                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                              <Typography fontWeight={600}>{recipe.name}</Typography>
                              {(recipe.ingredients || []).some(
                                ingredient => ingredient.type === 'recipe'
                              ) && <Chip size="small" label="Nested" color="secondary" />}
                              {(recipe.ingredients || []).some(
                                ingredient => ingredient.type === 'batch'
                              ) && (
                                <Chip
                                  size="small"
                                  label="Batch"
                                  color="primary"
                                  variant="outlined"
                                />
                              )}
                            </Stack>
                          }
                          secondary={
                            <Stack spacing={0.75} sx={{ mt: 0.5 }}>
                              <Typography variant="body2" color="text.secondary">
                                {recipe.description || 'No description'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {recipe.ingredients?.length || 0} components
                              </Typography>
                            </Stack>
                          }
                        />
                      </ListItemButton>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8} lg={8.5}>
            <Card sx={{ borderRadius: 4 }}>
              <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  justifyContent="space-between"
                  spacing={2}
                >
                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      {isEditing ? 'Recipe Workspace' : 'Recipe Detail'}
                    </Typography>
                    <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5 }}>
                      {isEditing
                        ? formData.recipe_name || 'New Recipe'
                        : selectedRecipe?.name || 'Choose a recipe'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {isEditing
                        ? 'Each component stays visible while you edit, which makes mixed ingredient and nested recipe structures easier to verify.'
                        : 'Review composition and usage together before making changes.'}
                    </Typography>
                  </Box>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    {selectedRecipe && !isEditing && (
                      <Button
                        variant="outlined"
                        startIcon={<Edit />}
                        onClick={() => startEdit(selectedRecipe)}
                      >
                        Edit
                      </Button>
                    )}
                    {isEditing && (
                      <>
                        <Button variant="text" onClick={cancelEditing}>
                          Cancel
                        </Button>
                        <Button variant="contained" onClick={saveRecipe} disabled={saving}>
                          {saving ? 'Saving...' : 'Save Recipe'}
                        </Button>
                      </>
                    )}
                  </Stack>
                </Stack>

                <Divider sx={{ my: 3 }} />

                {isEditing ? (
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Recipe Name"
                        value={formData.recipe_name}
                        onChange={event =>
                          setFormData(current => ({ ...current, recipe_name: event.target.value }))
                        }
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        minRows={3}
                        label="Instructions Or Notes"
                        value={formData.instructions}
                        onChange={event =>
                          setFormData(current => ({ ...current, instructions: event.target.value }))
                        }
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ mb: 2 }}
                      >
                        <Box>
                          <Typography variant="subtitle1" fontWeight={600}>
                            Components
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Mix raw ingredients, prep batches, and nested recipes in one table.
                          </Typography>
                        </Box>
                        <Button startIcon={<Add />} variant="outlined" onClick={addIngredientRow}>
                          Add Component
                        </Button>
                      </Stack>

                      <Stack spacing={2}>
                        {formData.ingredients.map((ingredient, index) => {
                          const availableOptions = referenceOptions.filter(
                            option => option.type === ingredient.type
                          );
                          const selectedOption =
                            availableOptions.find(
                              option => String(option.id) === ingredient.reference_id
                            ) || null;

                          return (
                            <Card
                              key={`${ingredient.type}-${index}`}
                              variant="outlined"
                              sx={{ borderRadius: 3 }}
                            >
                              <CardContent>
                                <Grid container spacing={2} alignItems="center">
                                  <Grid item xs={12} md={2.2}>
                                    <TextField
                                      select
                                      fullWidth
                                      label="Type"
                                      value={ingredient.type}
                                      onChange={event =>
                                        updateIngredientRow(index, 'type', event.target.value)
                                      }
                                    >
                                      <MenuItem value="ingredient">Ingredient</MenuItem>
                                      <MenuItem value="batch">Prep Batch</MenuItem>
                                      <MenuItem value="recipe">Recipe</MenuItem>
                                    </TextField>
                                  </Grid>
                                  <Grid item xs={12} md={4.8}>
                                    <Autocomplete
                                      options={availableOptions}
                                      value={selectedOption}
                                      getOptionLabel={option => option.name}
                                      onChange={(_, option) => applyReferenceOption(index, option)}
                                      renderInput={params => (
                                        <TextField
                                          {...params}
                                          label="Reference"
                                          helperText={
                                            selectedOption?.subtitle ||
                                            'Choose the linked component'
                                          }
                                        />
                                      )}
                                    />
                                  </Grid>
                                  <Grid item xs={12} md={2}>
                                    <TextField
                                      fullWidth
                                      type="number"
                                      label="Quantity"
                                      value={ingredient.quantity}
                                      onChange={event =>
                                        updateIngredientRow(index, 'quantity', event.target.value)
                                      }
                                    />
                                  </Grid>
                                  <Grid item xs={12} md={2}>
                                    <TextField
                                      fullWidth
                                      label="Unit"
                                      value={ingredient.unit}
                                      onChange={event =>
                                        updateIngredientRow(index, 'unit', event.target.value)
                                      }
                                    />
                                  </Grid>
                                  <Grid item xs={12} md={1}>
                                    <IconButton
                                      color="error"
                                      onClick={() => removeIngredientRow(index)}
                                    >
                                      <Delete />
                                    </IconButton>
                                  </Grid>
                                </Grid>
                              </CardContent>
                            </Card>
                          );
                        })}

                        {formData.ingredients.length === 0 && (
                          <Card variant="outlined" sx={{ borderRadius: 3, borderStyle: 'dashed' }}>
                            <CardContent>
                              <Typography color="text.secondary">
                                No components yet. Add the first ingredient, prep batch, or nested
                                recipe.
                              </Typography>
                            </CardContent>
                          </Card>
                        )}
                      </Stack>
                    </Grid>
                  </Grid>
                ) : selectedRecipe ? (
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={7}>
                      <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
                        <CardContent>
                          <Typography variant="subtitle1" fontWeight={600}>
                            Composition
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                            {selectedRecipe.description || 'No description provided.'}
                          </Typography>
                          <Divider sx={{ my: 2 }} />

                          <Stack spacing={1.5}>
                            {(selectedRecipe.ingredients || []).map((ingredient, index) => (
                              <Card
                                key={`${selectedRecipe.recipe_id}-${index}`}
                                variant="outlined"
                                sx={{ borderRadius: 3 }}
                              >
                                <CardContent sx={{ py: 2 }}>
                                  <Stack
                                    direction={{ xs: 'column', sm: 'row' }}
                                    justifyContent="space-between"
                                    spacing={1.5}
                                  >
                                    <Box>
                                      <Typography fontWeight={600}>{ingredient.name}</Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        {ingredient.quantity} {ingredient.unit}
                                      </Typography>
                                    </Box>
                                    <Chip
                                      size="small"
                                      label={
                                        ingredient.type === 'ingredient'
                                          ? 'Ingredient'
                                          : ingredient.type === 'batch'
                                            ? 'Prep Batch'
                                            : 'Nested Recipe'
                                      }
                                      color={
                                        ingredient.type === 'ingredient'
                                          ? 'default'
                                          : ingredient.type === 'batch'
                                            ? 'primary'
                                            : 'secondary'
                                      }
                                      variant={
                                        ingredient.type === 'ingredient' ? 'outlined' : 'filled'
                                      }
                                    />
                                  </Stack>
                                </CardContent>
                              </Card>
                            ))}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} md={5}>
                      <Stack spacing={2}>
                        <Card variant="outlined" sx={{ borderRadius: 3 }}>
                          <CardContent>
                            <Typography variant="subtitle1" fontWeight={600}>
                              Usage Impact
                            </Typography>
                            <Divider sx={{ my: 2 }} />
                            <Stack spacing={1.5}>
                              <Typography variant="body2" color="text.secondary">
                                Menu items: {usage?.usage?.menu_item_count ?? 0}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Nested in recipes: {usage?.usage?.nested_recipe_count ?? 0}
                              </Typography>
                              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                {(usage?.usage?.menu_items || []).map(item => (
                                  <Chip
                                    key={item.menu_item_id}
                                    label={item.menu_item_name}
                                    variant="outlined"
                                  />
                                ))}
                                {(usage?.usage?.nested_in_recipes || []).map(item => (
                                  <Chip
                                    key={item.recipe_id}
                                    label={item.recipe_name}
                                    color="secondary"
                                    variant="outlined"
                                  />
                                ))}
                              </Stack>
                            </Stack>
                          </CardContent>
                        </Card>

                        <Card variant="outlined" sx={{ borderRadius: 3 }}>
                          <CardContent>
                            <Typography variant="subtitle1" fontWeight={600}>
                              Graph Notes
                            </Typography>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="body2" color="text.secondary">
                              Nested recipe support is optional. If you use it, this view helps you
                              spot where archive or graph changes will ripple through the menu.
                            </Typography>
                          </CardContent>
                        </Card>

                        <Button color="warning" variant="outlined" onClick={archiveRecipe}>
                          Archive Recipe
                        </Button>
                      </Stack>
                    </Grid>
                  </Grid>
                ) : (
                  <Box sx={{ py: 10, textAlign: 'center' }}>
                    <Typography variant="h6">No recipe selected</Typography>
                    <Typography color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                      Choose a recipe from the list or start a new one.
                    </Typography>
                    <Button variant="contained" onClick={startCreate}>
                      Create Your First Recipe
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
