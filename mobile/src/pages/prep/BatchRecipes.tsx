// src/pages/prep/BatchRecipes.tsx
import React, { useState } from 'react';
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
  List,
  Divider,
} from 'react-native-paper';
import { useBatchRecipes } from '../../hooks/usePrep';
import { BatchRecipeData } from '../../interfaces/prep';

export default function BatchRecipes() {
  const theme = useTheme();
  const {
    recipes: batchRecipes,
    loading: isLoadingBatchRecipes,
    createRecipe: createBatchRecipe,
    updateRecipe: updateBatchRecipe,
    deleteRecipe: deleteBatchRecipe,
  } = useBatchRecipes();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<BatchRecipeData | null>(null);
  const [editingBatch, setEditingBatch] = useState<BatchRecipeData | null>(null);
  const [name, setName] = useState('');
  const [yieldQty, setYieldQty] = useState('');
  const [yieldUnit, setYieldUnit] = useState('');
  const [shelfLife, setShelfLife] = useState('');
  const [description, setDescription] = useState('');
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  // All batch recipes in one section (BatchRecipeData doesn't have category)
  const sections = [
    {
      title: 'All Batch Recipes',
      data: batchRecipes || [],
    },
  ];

  const openCreate = () => {
    setEditingBatch(null);
    setName('');
    setYieldQty('');
    setYieldUnit('');
    setShelfLife('');
    setDescription('');
    setDialogOpen(true);
  };

  const openEdit = (batch: BatchRecipeData) => {
    setEditingBatch(batch);
    setName(batch.batch_name);
    setYieldQty(batch.yield_quantity?.toString() || '');
    setYieldUnit(batch.yield_unit || '');
    setShelfLife(batch.shelf_life_days?.toString() || '');
    setDescription(batch.description || '');
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
        description: description.trim() || undefined,
        yield_quantity: yieldQty ? parseFloat(yieldQty) : 1,
        yield_unit: yieldUnit.trim() || 'batch',
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
    } catch (err: any) {
      setSnackbar({ visible: true, message: err?.message || 'Failed to save' });
    }
  };

  const handleDelete = async (batchId: number) => {
    try {
      await deleteBatchRecipe(batchId);
      setSnackbar({ visible: true, message: 'Batch recipe deleted' });
      setDetailItem(null);
    } catch (err: any) {
      setSnackbar({ visible: true, message: err?.message || 'Failed to delete' });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ color: theme.colors.onBackground }}>
          Batch Recipes
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Standardized prep recipes with yields
        </Text>
      </View>

      {isLoadingBatchRecipes ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : sections.length === 0 ? (
        <Card style={styles.emptyCard} mode="outlined">
          <Card.Content style={styles.emptyContent}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              No batch recipes yet
            </Text>
            <Button mode="contained" onPress={openCreate} style={{ marginTop: 16 }}>
              Create First Recipe
            </Button>
          </Card.Content>
        </Card>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item: BatchRecipeData) => String(item.batch_recipe_id || item.batch_name)}
          renderSectionHeader={({
            section,
          }: {
            section: { title: string; data: BatchRecipeData[] };
          }) => (
            <View style={[styles.sectionHeader, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {section.title}
              </Text>
              <Chip compact>{section.data.length}</Chip>
            </View>
          )}
          renderItem={({ item }: { item: BatchRecipeData }) => (
            <Card style={styles.recipeCard} mode="outlined" onPress={() => setDetailItem(item)}>
              <Card.Title
                title={item.batch_name}
                subtitle={
                  item.yield_quantity
                    ? `Yields ${item.yield_quantity} ${item.yield_unit || 'units'}`
                    : undefined
                }
                right={() => (
                  <View style={styles.cardActions}>
                    <IconButton icon="pencil" size={18} onPress={() => openEdit(item)} />
                  </View>
                )}
              />
              <Card.Content>
                <View style={styles.chipRow}>
                  {item.shelf_life_days && (
                    <Chip icon="calendar" compact>
                      {item.shelf_life_days} day shelf
                    </Chip>
                  )}
                  {item.description && (
                    <Chip icon="text" compact>
                      {item.description.slice(0, 20)}...
                    </Chip>
                  )}
                </View>
              </Card.Content>
            </Card>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      <FAB icon="plus" style={styles.fab} onPress={openCreate} label="Add Recipe" />

      {/* Detail Modal */}
      <Portal>
        <Dialog visible={!!detailItem} onDismiss={() => setDetailItem(null)}>
          <Dialog.Title>{detailItem?.batch_name}</Dialog.Title>
          <Dialog.ScrollArea>
            <View style={styles.detailContent}>
              <List.Item
                title="Yield"
                description={`${detailItem?.yield_quantity || '-'} ${detailItem?.yield_unit || ''}`}
                left={props => <List.Icon {...props} icon="scale" />}
              />
              <Divider />
              <List.Item
                title="Shelf Life"
                description={
                  detailItem?.shelf_life_days ? `${detailItem.shelf_life_days} days` : '-'
                }
                left={props => <List.Icon {...props} icon="calendar" />}
              />
              {detailItem?.description && (
                <>
                  <Divider />
                  <View style={styles.instructionsSection}>
                    <Text variant="labelMedium" style={{ marginBottom: 8 }}>
                      Description
                    </Text>
                    <Text variant="bodyMedium">{detailItem.description}</Text>
                  </View>
                </>
              )}
            </View>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button
              textColor={theme.colors.error}
              onPress={() =>
                detailItem?.batch_recipe_id && handleDelete(detailItem.batch_recipe_id)
              }
            >
              Delete
            </Button>
            <Button onPress={() => setDetailItem(null)}>Close</Button>
            <Button
              mode="contained"
              onPress={() => {
                if (detailItem) openEdit(detailItem);
                setDetailItem(null);
              }}
            >
              Edit
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Create/Edit Dialog */}
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
                label="Recipe Name"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Description"
                value={description}
                onChangeText={setDescription}
                mode="outlined"
                multiline
                numberOfLines={2}
                style={styles.input}
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
                  placeholder="gallons, kg"
                />
              </View>
              <TextInput
                label="Shelf Life (days)"
                value={shelfLife}
                onChangeText={setShelfLife}
                mode="outlined"
                keyboardType="numeric"
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
  cardActions: {
    flexDirection: 'row',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
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
  detailContent: {
    paddingVertical: 8,
  },
  instructionsSection: {
    padding: 16,
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
