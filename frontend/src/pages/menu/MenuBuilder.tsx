import React from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  CircularProgress,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { Search, RestaurantMenu, Edit, PlaylistAdd, Inventory2 } from '@mui/icons-material';
import useMenuForm from './hooks/useMenuForm';
import HintBox from './components/MenuHintBox';

export default function MenuBuilder() {
  const {
    menuItems,
    recipesList,
    categoriesList,
    formData,
    setFormData,
    selectedItem,
    setSelectedItemId,
    saveItem,
    archiveSelectedItem,
    reactivateSelectedItem,
    toggleRecipe,
    loading,
    saving,
    showInactive,
    setShowInactive,
    sortBy,
    setSortBy,
    searchQuery,
    setSearchQuery,
    stats,
    isEditing,
    startCreate,
    startEdit,
    cancelEditing,
  } = useMenuForm();

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 4, maxWidth: '1480px', mx: 'auto' }}>
      <Box
        sx={{
          mb: 3,
          p: { xs: 3, md: 4 },
          borderRadius: 4,
          color: 'common.white',
          background:
            'linear-gradient(135deg, rgba(22,78,99,1) 0%, rgba(15,118,110,0.96) 52%, rgba(101,163,13,0.92) 100%)',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent="space-between">
          <Box>
            <Typography variant="overline" sx={{ opacity: 0.82, letterSpacing: 1.6 }}>
              Menu And Recipes
            </Typography>
            <Typography variant="h3" fontWeight={700} sx={{ mt: 0.5 }}>
              Menu Builder
            </Typography>
            <Typography variant="body1" sx={{ mt: 1.5, maxWidth: 680, opacity: 0.92 }}>
              Keep item pricing, category structure, and recipe links visible in one workspace instead of hopping between cards and modals.
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ md: 'flex-start' }}>
            <Button
              variant="contained"
              startIcon={<PlaylistAdd />}
              onClick={startCreate}
              sx={{
                bgcolor: 'common.white',
                color: 'primary.dark',
                '&:hover': { bgcolor: 'grey.100' },
              }}
            >
              New Menu Item
            </Button>
            {selectedItem && !isEditing && (
              <Button
                variant="outlined"
                startIcon={<Edit />}
                onClick={() => startEdit(selectedItem)}
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
          { label: 'Visible Items', value: stats.totalItems, icon: <RestaurantMenu fontSize="small" /> },
          { label: 'Active Now', value: stats.activeItems, icon: <Inventory2 fontSize="small" /> },
          { label: 'Categories', value: stats.categoryCount, icon: <Chip size="small" label="A" /> },
          { label: 'Recipe Links', value: stats.linkedRecipeCount, icon: <Edit fontSize="small" /> },
        ].map(stat => (
          <Grid item xs={6} md={3} key={stat.label}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
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
          <Typography mt={2}>Loading menu items...</Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4} lg={3.5}>
            <Card sx={{ borderRadius: 4, mb: 3 }}>
              <CardContent>
                <TextField
                  fullWidth
                  placeholder="Search menu items, categories, or linked recipes"
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

                <Stack direction="row" spacing={1} sx={{ mt: 2, mb: 1 }}>
                  <Chip
                    label="Category"
                    color={sortBy === 'category' ? 'primary' : 'default'}
                    variant={sortBy === 'category' ? 'filled' : 'outlined'}
                    onClick={() => setSortBy('category')}
                  />
                  <Chip
                    label="Name"
                    color={sortBy === 'name' ? 'primary' : 'default'}
                    variant={sortBy === 'name' ? 'filled' : 'outlined'}
                    onClick={() => setSortBy('name')}
                  />
                  <Chip
                    label="Most Linked"
                    color={sortBy === 'recipes' ? 'primary' : 'default'}
                    variant={sortBy === 'recipes' ? 'filled' : 'outlined'}
                    onClick={() => setSortBy('recipes')}
                  />
                </Stack>

                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    Show archived items
                  </Typography>
                  <Switch checked={showInactive} onChange={event => setShowInactive(event.target.checked)} />
                </Stack>

                <Divider sx={{ my: 2 }} />

                {menuItems.length === 0 ? (
                  <Typography color="text.secondary">No menu items match the current filters.</Typography>
                ) : (
                  <List disablePadding sx={{ maxHeight: '58vh', overflowY: 'auto' }}>
                    {menuItems.map(item => (
                      <ListItemButton
                        key={item.menu_item_id}
                        selected={selectedItem?.menu_item_id === item.menu_item_id}
                        onClick={() => setSelectedItemId(item.menu_item_id)}
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
                              <Typography fontWeight={600}>{item.menu_item_name}</Typography>
                              {!item.is_active && <Chip size="small" color="warning" label="Archived" />}
                            </Stack>
                          }
                          secondary={
                            <Stack spacing={0.75} sx={{ mt: 0.5 }}>
                              <Typography variant="body2" color="text.secondary">
                                {(item.category || 'Uncategorized')} · ${Number(item.price || 0).toFixed(2)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {(item.recipes?.length || 0)} linked {(item.recipes?.length || 0) === 1 ? 'recipe' : 'recipes'}
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

            <HintBox />
          </Grid>

          <Grid item xs={12} md={8} lg={8.5}>
            <Card sx={{ borderRadius: 4 }}>
              <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      {isEditing ? 'Editing Workspace' : 'Item Detail'}
                    </Typography>
                    <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5 }}>
                      {isEditing
                        ? formData.menu_item_name || 'New Menu Item'
                        : selectedItem?.menu_item_name || 'Choose a menu item'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {isEditing
                        ? 'Keep pricing, category, and recipe assignment visible while you edit.'
                        : 'Use the left rail to scan the menu, then review linked recipes and ingredient impact here.'}
                    </Typography>
                  </Box>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    {selectedItem && !isEditing && (
                      <Button variant="outlined" startIcon={<Edit />} onClick={() => startEdit(selectedItem)}>
                        Edit
                      </Button>
                    )}
                    {isEditing && (
                      <>
                        <Button variant="text" onClick={cancelEditing}>
                          Cancel
                        </Button>
                        <Button variant="contained" onClick={saveItem} disabled={saving}>
                          {saving ? 'Saving...' : 'Save Item'}
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
                        label="Menu Item Name"
                        value={formData.menu_item_name}
                        onChange={event =>
                          setFormData(current => ({ ...current, menu_item_name: event.target.value }))
                        }
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="Price"
                        type="number"
                        inputProps={{ step: '0.01', min: '0' }}
                        value={formData.price}
                        onChange={event =>
                          setFormData(current => ({ ...current, price: event.target.value }))
                        }
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <Autocomplete
                        freeSolo
                        options={categoriesList}
                        value={formData.category || ''}
                        onChange={(_, value) =>
                          setFormData(current => ({ ...current, category: value || '' }))
                        }
                        onInputChange={(_, value) =>
                          setFormData(current => ({ ...current, category: value || '' }))
                        }
                        renderInput={params => <TextField {...params} label="Category" />}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Autocomplete
                        multiple
                        options={recipesList}
                        getOptionLabel={option => option.name || ''}
                        value={recipesList.filter(recipe => formData.recipes.includes(recipe.recipe_id))}
                        onChange={(_, values) =>
                          setFormData(current => ({
                            ...current,
                            recipes: values.map(value => value.recipe_id),
                          }))
                        }
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => (
                            <Chip {...getTagProps({ index })} key={option.recipe_id} label={option.name} />
                          ))
                        }
                        renderInput={params => (
                          <TextField
                            {...params}
                            label="Linked Recipes"
                            helperText="Attach one or more recipes that power this menu item."
                          />
                        )}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Card variant="outlined" sx={{ borderRadius: 3 }}>
                        <CardContent>
                          <Typography variant="subtitle1" fontWeight={600}>
                            Quick recipe picker
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Use this checklist when you want a faster assign/remove workflow than the autocomplete field.
                          </Typography>
                          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                            {recipesList.map(recipe => {
                              const active = formData.recipes.includes(recipe.recipe_id);
                              return (
                                <Chip
                                  key={recipe.recipe_id}
                                  label={recipe.name}
                                  color={active ? 'primary' : 'default'}
                                  variant={active ? 'filled' : 'outlined'}
                                  onClick={() => toggleRecipe(recipe.recipe_id)}
                                />
                              );
                            })}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                ) : selectedItem ? (
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
                        <CardContent>
                          <Typography variant="overline" color="text.secondary">
                            Snapshot
                          </Typography>
                          <Stack spacing={1.5} sx={{ mt: 1 }}>
                            <Typography variant="h5" fontWeight={700}>
                              ${Number(selectedItem.price || 0).toFixed(2)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Category: {selectedItem.category || 'Uncategorized'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {selectedItem.recipes?.length || 0} linked {(selectedItem.recipes?.length || 0) === 1 ? 'recipe' : 'recipes'}
                            </Typography>
                            <Box>
                              <Chip
                                size="small"
                                color={selectedItem.is_active ? 'success' : 'warning'}
                                label={selectedItem.is_active ? 'Active' : 'Archived'}
                              />
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} md={8}>
                      <Card variant="outlined" sx={{ borderRadius: 3 }}>
                        <CardContent>
                          <Typography variant="subtitle1" fontWeight={600}>
                            Linked Recipes
                          </Typography>
                          <Divider sx={{ my: 2 }} />
                          {selectedItem.recipes?.length ? (
                            <Stack spacing={2}>
                              {selectedItem.recipes.map(recipe => (
                                <Card key={recipe.recipe_id} variant="outlined" sx={{ borderRadius: 3 }}>
                                  <CardContent>
                                    <Typography variant="subtitle1" fontWeight={600}>
                                      {recipe.recipe_name}
                                    </Typography>
                                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.5 }}>
                                      {recipe.ingredients.map(ingredient => (
                                        <Chip
                                          key={`${recipe.recipe_id}-${ingredient.ingredient_id}-${ingredient.ingredient_name}`}
                                          label={`${ingredient.ingredient_name} · ${ingredient.quantity} ${ingredient.unit}`}
                                          variant="outlined"
                                        />
                                      ))}
                                    </Stack>
                                  </CardContent>
                                </Card>
                              ))}
                            </Stack>
                          ) : (
                            <Typography color="text.secondary">
                              No recipes are linked yet. Add one from the editor to make this item deduct inventory consistently.
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                        {selectedItem.is_active ? (
                          <Button color="warning" variant="outlined" onClick={archiveSelectedItem}>
                            Archive Item
                          </Button>
                        ) : (
                          <Button color="success" variant="contained" onClick={reactivateSelectedItem}>
                            Reactivate Item
                          </Button>
                        )}
                      </Stack>
                    </Grid>
                  </Grid>
                ) : (
                  <Box sx={{ py: 10, textAlign: 'center' }}>
                    <Typography variant="h6">No menu item selected</Typography>
                    <Typography color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                      Start a new item or pick one from the list to review its recipe links.
                    </Typography>
                    <Button variant="contained" onClick={startCreate}>
                      Create Your First Item
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
