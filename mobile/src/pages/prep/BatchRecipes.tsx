// src/pages/prep/BatchRecipes.tsx
import React, { useState } from 'react';
import { View, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import {
  Text,
  useTheme,
  FAB,
  Snackbar,
  ActivityIndicator,
  Surface,
  Button,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useBatchRecipes, useIngredients } from './hooks/useBatchRecipes';
import { BatchRecipeModal, BatchRecipeDetail, BatchRecipeList } from './components';
import type { BatchRecipe, BatchRecipeCreate, BatchRecipeUpdate } from '../../interfaces/prep';

export default function BatchRecipes() {
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  // Hooks
  const {
    recipes,
    loading: loadingRecipes,
    error: errorRecipes,
    createRecipe,
    creating,
    updateRecipe,
    updating,
    deleteRecipe,
    deleting,
    refetch,
  } = useBatchRecipes();

  const { ingredients, loading: loadingIngredients } = useIngredients();

  // State
  const [selectedRecipe, setSelectedRecipe] = useState<BatchRecipe | null>(null);
  const [editRecipe, setEditRecipe] = useState<BatchRecipe | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Handlers
  const handleSelectRecipe = (recipe: BatchRecipe) => {
    setSelectedRecipe(recipe);
    setShowDetailModal(true);
  };

  const handleEditRecipe = (recipe: BatchRecipe) => {
    setEditRecipe(recipe);
    setShowCreateModal(true);
  };

  const handleOpenCreate = () => {
    setEditRecipe(null);
    setShowCreateModal(true);
  };

  const handleSaveRecipe = async (data: BatchRecipeCreate) => {
    try {
      if (editRecipe && editRecipe.batch_recipe_id) {
        await updateRecipe({ id: editRecipe.batch_recipe_id, data: data as BatchRecipeUpdate });
        setSnackbar({ visible: true, message: 'Batch recipe updated!' });
      } else {
        await createRecipe(data);
        setSnackbar({ visible: true, message: 'Batch recipe created!' });
      }
      setShowCreateModal(false);
      setEditRecipe(null);
    } catch (err: any) {
      setSnackbar({ visible: true, message: err?.message || 'Failed to save recipe' });
    }
  };

  const handleDeleteRecipe = async (id: number) => {
    try {
      await deleteRecipe(id);
      setSnackbar({ visible: true, message: 'Batch recipe deleted' });
      setShowDetailModal(false);
      setSelectedRecipe(null);
    } catch (err: any) {
      setSnackbar({ visible: true, message: err?.message || 'Failed to delete recipe' });
    }
  };

  // Loading state
  const isLoading = loadingRecipes || loadingIngredients;

  if (isLoading && recipes.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16 }}>Loading batch recipes...</Text>
      </View>
    );
  }

  // Error state
  if (errorRecipes) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <MaterialCommunityIcons name="alert-circle" size={48} color={theme.colors.error} />
        <Text style={{ marginTop: 16, color: theme.colors.error }}>
          Failed to load batch recipes
        </Text>
        <Button mode="contained" onPress={() => refetch()} style={{ marginTop: 16 }}>
          Retry
        </Button>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <Surface style={styles.headerSurface} elevation={1}>
        <View style={styles.headerRow}>
          <MaterialCommunityIcons name="clipboard-list" size={28} color={theme.colors.primary} />
          <View style={styles.headerText}>
            <Text variant="titleLarge" style={{ fontWeight: '600' }}>
              Batch Recipes
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Standardized prep recipes with yields
            </Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text
              variant="headlineMedium"
              style={{ fontWeight: '700', color: theme.colors.primary }}
            >
              {recipes.length}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Total Recipes
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text
              variant="headlineMedium"
              style={{ fontWeight: '700', color: theme.colors.secondary }}
            >
              {recipes.reduce((sum, r) => sum + (r.ingredients?.length || 0), 0)}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Total Ingredients
            </Text>
          </View>
        </View>
      </Surface>

      {/* Recipe List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <BatchRecipeList
          recipes={recipes}
          selectedId={selectedRecipe?.batch_recipe_id || null}
          onSelect={handleSelectRecipe}
          onEdit={handleEditRecipe}
        />
      </ScrollView>

      {/* FAB */}
      <FAB
        icon="plus"
        label="New Recipe"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={handleOpenCreate}
      />

      {/* Create/Edit Modal */}
      <BatchRecipeModal
        visible={showCreateModal}
        onDismiss={() => {
          setShowCreateModal(false);
          setEditRecipe(null);
        }}
        onSave={handleSaveRecipe}
        ingredients={ingredients}
        loading={creating || updating}
        editRecipe={editRecipe}
      />

      {/* Detail Modal */}
      <BatchRecipeDetail
        visible={showDetailModal}
        recipe={selectedRecipe}
        onDismiss={() => {
          setShowDetailModal(false);
          setSelectedRecipe(null);
        }}
        onEdit={handleEditRecipe}
        onDelete={handleDeleteRecipe}
        deleting={deleting}
      />

      {/* Snackbar */}
      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={3000}
        action={{ label: 'OK', onPress: () => setSnackbar({ ...snackbar, visible: false }) }}
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  headerSurface: {
    padding: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
