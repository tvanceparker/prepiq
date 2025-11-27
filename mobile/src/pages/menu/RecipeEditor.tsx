// src/pages/menu/RecipeEditor.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, SectionList } from 'react-native';
import {
  Text,
  useTheme,
  Card,
  Button,
  TextInput,
  FAB,
  Portal,
  Dialog,
  Snackbar,
  ActivityIndicator,
  List,
  IconButton,
  Chip,
  Divider,
} from 'react-native-paper';
import { useRecipes, useIngredients } from '../../hooks/useMenu';
import { Recipe, RecipeIngredient, Ingredient } from '../../interfaces/menu';

export default function RecipeEditor() {
  const theme = useTheme();
  const {
    recipes,
    loading: isLoadingRecipes,
    createRecipe,
    updateRecipe,
    deleteRecipe,
  } = useRecipes();
  const { ingredients } = useIngredients();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [instructions, setInstructions] = useState('');
  const [selectedIngredients, setSelectedIngredients] = useState<
    { ingredient_id: number; quantity: string }[]
  >([]);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const openCreate = () => {
    setEditingRecipe(null);
    setName('');
    setCategory('');
    setPrepTime('');
    setInstructions('');
    setSelectedIngredients([]);
    setDialogOpen(true);
  };

  const openEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setName(recipe.recipe_name);
    setCategory(''); // Recipe interface doesn't have category
    setPrepTime(recipe.prep_time_minutes?.toString() || '');
    setInstructions(recipe.description || '');
    setSelectedIngredients(
      (recipe.ingredients || []).map(ri => ({
        ingredient_id: ri.ingredient_id,
        quantity: ri.quantity?.toString() || '',
      }))
    );
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setSnackbar({ visible: true, message: 'Recipe name is required' });
      return;
    }

    try {
      const data = {
        recipe_name: name.trim(),
        description: instructions.trim() || undefined,
        yield_quantity: 1, // Default
        yield_unit: 'batch',
        prep_time_minutes: prepTime ? parseInt(prepTime, 10) : undefined,
        ingredients: selectedIngredients
          .filter(si => si.ingredient_id && si.quantity)
          .map(si => ({
            ingredient_id: si.ingredient_id,
            quantity: parseFloat(si.quantity),
            unit: 'each', // Default unit
          })),
      };

      if (editingRecipe) {
        await updateRecipe({ id: editingRecipe.recipe_id, data });
        setSnackbar({ visible: true, message: 'Recipe updated' });
      } else {
        await createRecipe(data);
        setSnackbar({ visible: true, message: 'Recipe created' });
      }
      setDialogOpen(false);
    } catch (err: any) {
      setSnackbar({ visible: true, message: err?.message || 'Failed to save recipe' });
    }
  };

  const handleDelete = async (recipeId: number) => {
    try {
      await deleteRecipe(recipeId);
      setSnackbar({ visible: true, message: 'Recipe deleted' });
    } catch (err: any) {
      setSnackbar({ visible: true, message: err?.message || 'Failed to delete' });
    }
  };

  // Group recipes (Recipe interface doesn't have category)
  const sections = [
    {
      title: 'All Recipes',
      data: recipes || [],
    },
  ];

  const getIngredientName = (id: number) => {
    const ing = (ingredients || []).find((i: Ingredient) => i.ingredient_id === id);
    return ing?.name || `Ingredient #${id}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ color: theme.colors.onBackground }}>
          Recipe Editor
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Create and manage recipes with ingredients
        </Text>
      </View>

      {isLoadingRecipes ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : sections.length === 0 ? (
        <Card style={styles.emptyCard} mode="outlined">
          <Card.Content style={styles.emptyContent}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              No recipes yet
            </Text>
            <Button mode="contained" onPress={openCreate} style={{ marginTop: 16 }}>
              Create First Recipe
            </Button>
          </Card.Content>
        </Card>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item: Recipe) => String(item.recipe_id)}
          renderSectionHeader={({ section }: { section: { title: string; data: Recipe[] } }) => (
            <View style={[styles.sectionHeader, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {section.title}
              </Text>
              <Chip compact>{section.data.length}</Chip>
            </View>
          )}
          renderItem={({ item }: { item: Recipe }) => (
            <Card style={styles.recipeCard} mode="outlined" onPress={() => openEdit(item)}>
              <Card.Title
                title={item.recipe_name}
                subtitle={
                  item.prep_time_minutes
                    ? `Prep: ${item.prep_time_minutes} min • ${
                        item.ingredients?.length || 0
                      } ingredients`
                    : `${item.ingredients?.length || 0} ingredients`
                }
                right={() => (
                  <IconButton
                    icon="delete"
                    size={20}
                    iconColor={theme.colors.error}
                    onPress={() => handleDelete(item.recipe_id)}
                  />
                )}
              />
            </Card>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      <FAB icon="plus" style={styles.fab} onPress={openCreate} label="Add Recipe" />

      {/* Create/Edit Dialog */}
      <Portal>
        <Dialog
          visible={dialogOpen}
          onDismiss={() => setDialogOpen(false)}
          style={{ maxHeight: '90%' }}
        >
          <Dialog.Title>{editingRecipe ? 'Edit Recipe' : 'New Recipe'}</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView contentContainerStyle={styles.dialogContent}>
              <TextInput
                label="Recipe Name"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Category"
                value={category}
                onChangeText={setCategory}
                mode="outlined"
                style={styles.input}
                placeholder="e.g., Sauce, Dressing, Base"
              />
              <TextInput
                label="Prep Time (minutes)"
                value={prepTime}
                onChangeText={setPrepTime}
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
              />
              <TextInput
                label="Instructions"
                value={instructions}
                onChangeText={setInstructions}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.input}
              />

              <Text variant="labelMedium" style={styles.sectionLabel}>
                Ingredients
              </Text>
              {selectedIngredients.map((si, idx) => (
                <View key={idx} style={styles.ingredientRow}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.ingChips}
                  >
                    {(ingredients || []).slice(0, 10).map((ing: Ingredient) => (
                      <Chip
                        key={ing.ingredient_id}
                        selected={si.ingredient_id === ing.ingredient_id}
                        onPress={() => {
                          const updated = [...selectedIngredients];
                          updated[idx].ingredient_id = ing.ingredient_id;
                          setSelectedIngredients(updated);
                        }}
                        compact
                        style={styles.ingChip}
                      >
                        {ing.name}
                      </Chip>
                    ))}
                  </ScrollView>
                  <TextInput
                    label="Qty"
                    value={si.quantity}
                    onChangeText={v => {
                      const updated = [...selectedIngredients];
                      updated[idx].quantity = v;
                      setSelectedIngredients(updated);
                    }}
                    mode="outlined"
                    keyboardType="numeric"
                    style={styles.qtyInput}
                    dense
                  />
                  <IconButton
                    icon="close"
                    size={18}
                    onPress={() =>
                      setSelectedIngredients(selectedIngredients.filter((_, i) => i !== idx))
                    }
                  />
                </View>
              ))}
              <Button
                mode="text"
                icon="plus"
                onPress={() =>
                  setSelectedIngredients([
                    ...selectedIngredients,
                    { ingredient_id: 0, quantity: '' },
                  ])
                }
              >
                Add Ingredient
              </Button>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setDialogOpen(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleSave}>
              {editingRecipe ? 'Update' : 'Create'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={3000}
      >
        {snackbar.message}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyCard: {
    margin: 16,
  },
  emptyContent: {
    alignItems: 'center',
    padding: 32,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    marginTop: 8,
  },
  recipeCard: {
    marginBottom: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  dialogContent: {
    padding: 16,
  },
  input: {
    marginBottom: 12,
  },
  sectionLabel: {
    marginTop: 8,
    marginBottom: 8,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ingChips: {
    flex: 1,
    flexDirection: 'row',
  },
  ingChip: {
    marginRight: 4,
  },
  qtyInput: {
    width: 70,
    marginLeft: 8,
  },
});
