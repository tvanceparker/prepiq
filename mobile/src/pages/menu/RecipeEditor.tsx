// src/pages/menu/RecipeEditor.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme, Card, Button, FAB, Snackbar, ActivityIndicator } from 'react-native-paper';
import { useRecipes, useIngredients } from '../../hooks/useMenu';
import { Recipe } from '../../interfaces/menu';
import RecipeCard from './components/RecipeCard';
import RecipeDialog from './components/RecipeDialog';

export default function RecipeEditor() {
  const theme = useTheme();
  const {
    recipes,
    loading: isLoadingRecipes,
    createRecipe,
    updateRecipe,
    deleteRecipe,
  } = useRecipes();
  const { ingredients, loading: ingredientsLoading } = useIngredients();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const openCreate = () => {
    setEditingRecipe(null);
    setDialogOpen(true);
  };

  const openEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setDialogOpen(true);
  };

  const handleSave = async (data: {
    name: string;
    description?: string;
    ingredients: { ingredient_id: number; quantity: number; unit: string }[];
  }) => {
    setSaving(true);
    try {
      const payload = {
        ...data,
        yield_quantity: 1,
        yield_unit: 'batch',
      };

      if (editingRecipe) {
        await updateRecipe({ id: editingRecipe.recipe_id, data: payload });
        setSnackbar({ visible: true, message: 'Recipe updated successfully' });
      } else {
        await createRecipe(payload);
        setSnackbar({ visible: true, message: 'Recipe created successfully' });
      }
      setDialogOpen(false);
      setEditingRecipe(null);
    } catch (err: any) {
      setSnackbar({ visible: true, message: err?.message || 'Failed to save recipe' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingRecipe) return;

    setSaving(true);
    try {
      await deleteRecipe(editingRecipe.recipe_id);
      setSnackbar({ visible: true, message: 'Recipe deleted successfully' });
      setDialogOpen(false);
      setEditingRecipe(null);
    } catch (err: any) {
      setSnackbar({ visible: true, message: err?.message || 'Failed to delete recipe' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ color: theme.colors.onBackground }}>
          Recipe Editor
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Create and manage recipes with ingredients
        </Text>
      </View>

      {/* Content */}
      {isLoadingRecipes ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : (recipes || []).length === 0 ? (
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
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {recipes?.map(recipe => (
            <RecipeCard key={recipe.recipe_id} recipe={recipe} onEdit={openEdit} />
          ))}
        </ScrollView>
      )}

      {/* FAB */}
      <FAB icon="plus" style={styles.fab} onPress={openCreate} label="Add Recipe" />

      {/* Dialog */}
      <RecipeDialog
        visible={dialogOpen}
        editingRecipe={editingRecipe}
        availableIngredients={ingredients || []}
        availableBatchRecipes={[]}
        ingredientsLoading={ingredientsLoading}
        saving={saving}
        onDismiss={() => {
          setDialogOpen(false);
          setEditingRecipe(null);
        }}
        onSave={handleSave}
        onDelete={editingRecipe ? handleDelete : undefined}
      />

      {/* Snackbar */}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
