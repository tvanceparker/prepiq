// src/pages/menu/PrepBatches.tsx
import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import {
  Text,
  useTheme,
  Card,
  Button,
  FAB,
  Portal,
  Dialog,
  TextInput,
  Snackbar,
  ActivityIndicator,
  Chip,
  IconButton,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useBatchRecipes } from '../../hooks/usePrep';
import { BatchRecipeData } from '../../interfaces/prep';

export default function PrepBatches() {
  const theme = useTheme();
  const {
    recipes: batchRecipes,
    loading: isLoadingBatchRecipes,
    createRecipe: createBatchRecipe,
    updateRecipe: updateBatchRecipe,
    deleteRecipe: deleteBatchRecipe,
  } = useBatchRecipes();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<BatchRecipeData | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [yieldQty, setYieldQty] = useState('');
  const [yieldUnit, setYieldUnit] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [shelfLife, setShelfLife] = useState('');
  const [instructions, setInstructions] = useState('');
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const openCreate = () => {
    setEditingBatch(null);
    setName('');
    setCategory('');
    setYieldQty('');
    setYieldUnit('');
    setPrepTime('');
    setShelfLife('');
    setInstructions('');
    setDialogOpen(true);
  };

  const openEdit = (batch: BatchRecipeData) => {
    setEditingBatch(batch);
    setName(batch.batch_name);
    setCategory(''); // BatchRecipeData doesn't have category
    setYieldQty(batch.yield_quantity?.toString() || '');
    setYieldUnit(batch.yield_unit || '');
    setPrepTime(''); // BatchRecipeData doesn't have prep_time_minutes
    setShelfLife(batch.shelf_life_days?.toString() || '');
    setInstructions(batch.description || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setSnackbar({ visible: true, message: 'Batch name is required' });
      return;
    }

    try {
      const data: BatchRecipeData = {
        batch_name: name.trim(),
        description: instructions.trim() || undefined,
        yield_quantity: yieldQty ? parseFloat(yieldQty) : 1,
        yield_unit: yieldUnit.trim() || 'units',
        shelf_life_days: shelfLife ? parseInt(shelfLife, 10) : undefined,
      };

      if (editingBatch && editingBatch.batch_recipe_id) {
        await updateBatchRecipe({ id: editingBatch.batch_recipe_id, data });
        setSnackbar({ visible: true, message: 'Batch recipe updated' });
      } else {
        await createBatchRecipe(data);
        setSnackbar({ visible: true, message: 'Batch recipe created' });
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      const error = err as Error;
      setSnackbar({ visible: true, message: error?.message || 'Failed to save' });
    }
  };

  const handleDelete = async (batchId: number) => {
    try {
      await deleteBatchRecipe(batchId);
      setSnackbar({ visible: true, message: 'Batch recipe deleted' });
    } catch (err: unknown) {
      const error = err as Error;
      setSnackbar({ visible: true, message: error?.message || 'Failed to delete' });
    }
  };

  const renderItem = ({ item }: { item: BatchRecipeData }) => (
    <Card style={styles.card} mode="outlined" onPress={() => openEdit(item)}>
      <Card.Title
        title={item.batch_name}
        subtitle={item.description}
        right={() => (
          <IconButton
            icon={() => (
              <MaterialCommunityIcons name="delete" size={20} color={theme.colors.error} />
            )}
            size={20}
            onPress={() => item.batch_recipe_id && handleDelete(item.batch_recipe_id)}
          />
        )}
      />
      <Card.Content>
        <View style={styles.chipRow}>
          {item.yield_quantity && (
            <View style={styles.infoChip}>
              <MaterialCommunityIcons
                name="scale"
                size={14}
                color={theme.colors.onSurfaceVariant}
              />
              <Text variant="labelSmall" style={{ marginLeft: 4 }}>
                Yields {item.yield_quantity} {item.yield_unit || 'units'}
              </Text>
            </View>
          )}
          {item.shelf_life_days && (
            <View style={styles.infoChip}>
              <MaterialCommunityIcons
                name="calendar"
                size={14}
                color={theme.colors.onSurfaceVariant}
              />
              <Text variant="labelSmall" style={{ marginLeft: 4 }}>
                {item.shelf_life_days} day shelf
              </Text>
            </View>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ color: theme.colors.onBackground }}>
          Prep Batches
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Standardized batch recipes for prep work
        </Text>
      </View>

      {isLoadingBatchRecipes ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : (
        <FlatList
          data={batchRecipes || []}
          keyExtractor={item => String(item.batch_recipe_id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Card style={styles.emptyCard} mode="outlined">
              <Card.Content style={styles.emptyContent}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                  No batch recipes yet
                </Text>
                <Button mode="contained" onPress={openCreate} style={{ marginTop: 16 }}>
                  Create First Batch
                </Button>
              </Card.Content>
            </Card>
          }
        />
      )}

      <FAB
        icon={() => <MaterialCommunityIcons name="plus" size={24} color={theme.colors.onPrimary} />}
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={openCreate}
        label="Add Batch"
      />

      <Portal>
        <Dialog
          visible={dialogOpen}
          onDismiss={() => setDialogOpen(false)}
          style={{ maxHeight: '90%' }}
        >
          <Dialog.Title>{editingBatch ? 'Edit Batch Recipe' : 'New Batch Recipe'}</Dialog.Title>
          <Dialog.ScrollArea>
            <View style={styles.dialogContent}>
              <TextInput
                label="Batch Name"
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
                placeholder="e.g., Sauce, Dough, Base"
              />
              <View style={styles.row}>
                <TextInput
                  label="Yield Qty"
                  value={yieldQty}
                  onChangeText={setYieldQty}
                  mode="outlined"
                  keyboardType="numeric"
                  style={[styles.input, styles.halfInput]}
                />
                <TextInput
                  label="Yield Unit"
                  value={yieldUnit}
                  onChangeText={setYieldUnit}
                  mode="outlined"
                  style={[styles.input, styles.halfInput]}
                  placeholder="e.g., gallons, kg"
                />
              </View>
              <View style={styles.row}>
                <TextInput
                  label="Prep Time (min)"
                  value={prepTime}
                  onChangeText={setPrepTime}
                  mode="outlined"
                  keyboardType="numeric"
                  style={[styles.input, styles.halfInput]}
                />
                <TextInput
                  label="Shelf Life (days)"
                  value={shelfLife}
                  onChangeText={setShelfLife}
                  mode="outlined"
                  keyboardType="numeric"
                  style={[styles.input, styles.halfInput]}
                />
              </View>
              <TextInput
                label="Instructions"
                value={instructions}
                onChangeText={setInstructions}
                mode="outlined"
                multiline
                numberOfLines={4}
                style={styles.input}
              />
            </View>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setDialogOpen(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleSave}>
              {editingBatch ? 'Update' : 'Create'}
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
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginRight: 4,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  emptyCard: {
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
  dialogContent: {
    padding: 16,
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
