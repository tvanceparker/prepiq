// src/pages/menu/PrepBatches.tsx
import React, { useMemo, useState } from 'react';
import { View, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import {
  Text,
  useTheme,
  FAB,
  Snackbar,
  ActivityIndicator,
  Surface,
  Button,
  TextInput,
  Chip,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useBatchRecipes, useIngredients } from '../prep/hooks/useBatchRecipes';
import { BatchRecipeModal, BatchRecipeDetail, BatchRecipeList } from '../prep/components';
import type { BatchRecipe, BatchRecipeCreate, BatchRecipeUpdate } from '../../interfaces/prep';

type ShelfFilter = 'all' | 'short' | 'long';

export default function PrepBatches() {
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);

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

  const [selectedRecipe, setSelectedRecipe] = useState<BatchRecipe | null>(null);
  const [editRecipe, setEditRecipe] = useState<BatchRecipe | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [shelfFilter, setShelfFilter] = useState<ShelfFilter>('all');

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

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

  const filteredRecipes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return recipes.filter(recipe => {
      const matchesQuery =
        !query ||
        recipe.name.toLowerCase().includes(query) ||
        recipe.description?.toLowerCase().includes(query);
      const shelfLife = recipe.shelf_life_days ?? 0;
      const matchesShelf =
        shelfFilter === 'all' ||
        (shelfFilter === 'short' && shelfLife > 0 && shelfLife <= 2) ||
        (shelfFilter === 'long' && shelfLife >= 5);
      return matchesQuery && matchesShelf;
    });
  }, [recipes, searchQuery, shelfFilter]);

  const stats = useMemo(() => {
    const totalRecipes = recipes.length;
    const shortShelfCount = recipes.filter(r => (r.shelf_life_days ?? 0) <= 2).length;
    const avgPrepTime =
      totalRecipes === 0
        ? 0
        : Math.round(
            recipes.reduce((sum, recipe) => sum + (recipe.estimated_prep_time_minutes || 0), 0) /
              totalRecipes
          );
    return { totalRecipes, shortShelfCount, avgPrepTime };
  }, [recipes]);

  const isLoading = loadingRecipes || loadingIngredients;

  if (isLoading && recipes.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16 }}>Loading prep batches...</Text>
      </View>
    );
  }

  if (errorRecipes) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <MaterialCommunityIcons name="alert-circle" size={48} color={theme.colors.error} />
        <Text style={{ marginTop: 16, color: theme.colors.error }}>
          Failed to load prep batches
        </Text>
        <Button mode="contained" onPress={() => refetch()} style={{ marginTop: 16 }}>
          Retry
        </Button>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface style={styles.headerSurface} elevation={1}>
        <View style={styles.headerRow}>
          <MaterialCommunityIcons name="clipboard-list" size={28} color={theme.colors.primary} />
          <View style={styles.headerText}>
            <Text variant="titleLarge" style={{ fontWeight: '600' }}>
              Prep Batches
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Menu shortcut for batch recipes and yield planning
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text
              variant="headlineMedium"
              style={{ fontWeight: '700', color: theme.colors.primary }}
            >
              {stats.totalRecipes}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Total Batches
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text
              variant="headlineMedium"
              style={{ fontWeight: '700', color: theme.colors.secondary }}
            >
              {stats.shortShelfCount}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Short Shelf
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text
              variant="headlineMedium"
              style={{ fontWeight: '700', color: theme.colors.primary }}
            >
              {stats.avgPrepTime}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Avg Prep (min)
            </Text>
          </View>
        </View>

        <TextInput
          mode="outlined"
          placeholder="Search batches"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
          left={<TextInput.Icon icon="magnify" />}
        />

        <View style={styles.filterRow}>
          <Chip
            selected={shelfFilter === 'all'}
            onPress={() => setShelfFilter('all')}
            style={styles.filterChip}
          >
            All
          </Chip>
          <Chip
            selected={shelfFilter === 'short'}
            onPress={() => setShelfFilter('short')}
            style={styles.filterChip}
          >
            Short Shelf
          </Chip>
          <Chip
            selected={shelfFilter === 'long'}
            onPress={() => setShelfFilter('long')}
            style={styles.filterChip}
          >
            Long Shelf
          </Chip>
        </View>
      </Surface>

      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <BatchRecipeList
          recipes={filteredRecipes}
          selectedId={selectedRecipe?.batch_recipe_id || null}
          onSelect={handleSelectRecipe}
          onEdit={handleEditRecipe}
        />
      </ScrollView>

      <FAB
        icon="plus"
        label="New Batch"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={handleOpenCreate}
      />

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
  searchInput: {
    marginTop: 16,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  filterChip: {
    marginRight: 4,
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
