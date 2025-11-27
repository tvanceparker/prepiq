// src/pages/menu/IngredientCatalog.tsx
import React, { useState, useMemo } from 'react';
import { View, StyleSheet, SectionList } from 'react-native';
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
  Chip,
  IconButton,
  Searchbar,
} from 'react-native-paper';
import { useIngredients } from '../../hooks/useMenu';
import { Ingredient } from '../../interfaces/menu';

export default function IngredientCatalog() {
  const theme = useTheme();
  const { ingredients, loading: isLoadingIngredients, upsertIngredient } = useIngredients();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  // Filter and group ingredients
  const filteredIngredients = useMemo(() => {
    if (!ingredients) return [];
    const q = search.toLowerCase();
    return ingredients.filter(
      (i: Ingredient) =>
        i.name.toLowerCase().includes(q) ||
        (i.category && i.category.toLowerCase().includes(q))
    );
  }, [ingredients, search]);

  const sections = useMemo(() => {
    const categorySet = new Set<string>(filteredIngredients.map((i: Ingredient) => i.category || 'Uncategorized'));
    const categories = Array.from(categorySet).sort();
    return categories.map((cat) => ({
      title: cat,
      data: filteredIngredients.filter((i: Ingredient) => (i.category || 'Uncategorized') === cat),
    }));
  }, [filteredIngredients]);

  const openCreate = () => {
    setEditingIngredient(null);
    setName('');
    setCategory('');
    setUnit('');
    setCostPerUnit('');
    setDialogOpen(true);
  };

  const openEdit = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setName(ingredient.name);
    setCategory(ingredient.category || '');
    setUnit(ingredient.unit || '');
    setCostPerUnit(ingredient.cost_per_unit?.toString() || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setSnackbar({ visible: true, message: 'Ingredient name is required' });
      return;
    }

    try {
      const data = {
        ingredient_id: editingIngredient?.ingredient_id,
        name: name.trim(),
        category: category.trim() || undefined,
        unit: unit.trim() || undefined,
        cost_per_unit: costPerUnit ? parseFloat(costPerUnit) : undefined,
      };

      await upsertIngredient(data);
      setSnackbar({ visible: true, message: editingIngredient ? 'Ingredient updated' : 'Ingredient created' });
      setDialogOpen(false);
    } catch (err: unknown) {
      const error = err as Error;
      setSnackbar({ visible: true, message: error?.message || 'Failed to save' });
    }
  };

  const handleDelete = async (ingredientId: number) => {
    try {
      // Delete not available through upsertIngredient - would need separate API
      console.log('Delete ingredient:', ingredientId);
      setSnackbar({ visible: true, message: 'Delete functionality not yet implemented' });
    } catch (err: unknown) {
      const error = err as Error;
      setSnackbar({ visible: true, message: error?.message || 'Failed to delete' });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ color: theme.colors.onBackground }}>
          Ingredient Catalog
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Manage ingredients with costing info
        </Text>
      </View>

      <Searchbar
        placeholder="Search ingredients..."
        value={search}
        onChangeText={setSearch}
        style={styles.searchbar}
      />

      {isLoadingIngredients ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : sections.length === 0 ? (
        <Card style={styles.emptyCard} mode="outlined">
          <Card.Content style={styles.emptyContent}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              {search ? 'No matching ingredients' : 'No ingredients yet'}
            </Text>
            {!search && (
              <Button mode="contained" onPress={openCreate} style={{ marginTop: 16 }}>
                Add First Ingredient
              </Button>
            )}
          </Card.Content>
        </Card>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.ingredient_id)}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {section.title}
              </Text>
              <Chip compact>{section.data.length}</Chip>
            </View>
          )}
          renderItem={({ item }) => (
            <Card style={styles.ingredientCard} mode="outlined" onPress={() => openEdit(item)}>
              <Card.Title
                title={item.name}
                subtitle={item.unit ? `Unit: ${item.unit}` : undefined}
                right={() => (
                  <View style={styles.cardRight}>
                    {item.cost_per_unit !== undefined && item.cost_per_unit !== null && (
                      <Chip compact style={styles.costChip}>
                        ${item.cost_per_unit.toFixed(2)}/{item.unit || 'unit'}
                      </Chip>
                    )}
                    <IconButton
                      icon="delete"
                      size={18}
                      iconColor={theme.colors.error}
                      onPress={() => handleDelete(item.ingredient_id)}
                    />
                  </View>
                )}
              />
            </Card>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      <FAB icon="plus" style={styles.fab} onPress={openCreate} label="Add Ingredient" />

      <Portal>
        <Dialog visible={dialogOpen} onDismiss={() => setDialogOpen(false)}>
          <Dialog.Title>{editingIngredient ? 'Edit Ingredient' : 'New Ingredient'}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Name"
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
              placeholder="e.g., Produce, Dairy, Protein"
            />
            <TextInput
              label="Unit"
              value={unit}
              onChangeText={setUnit}
              mode="outlined"
              style={styles.input}
              placeholder="e.g., lb, kg, oz, each"
            />
            <TextInput
              label="Cost/Unit ($)"
              value={costPerUnit}
              onChangeText={setCostPerUnit}
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogOpen(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleSave}>
              {editingIngredient ? 'Update' : 'Create'}
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
  searchbar: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
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
  ingredientCard: {
    marginBottom: 8,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  costChip: {
    marginRight: 4,
  },
  emptyCard: {
    margin: 16,
    marginTop: 32,
  },
  emptyContent: {
    alignItems: 'center',
    padding: 32,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
});
