// src/pages/prep/PrepSchedule.tsx
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import {
  Surface,
  Text,
  Card,
  Button,
  Chip,
  ActivityIndicator,
  Portal,
  Dialog,
  TextInput,
  FAB,
  IconButton,
  Divider,
  useTheme,
  SegmentedButtons,
  Snackbar,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { usePrepSchedule, useBatchRecipesForSchedule } from './hooks/usePrepSchedule';
import type { PrepScheduleItem, BatchRecipe } from '../../interfaces/prep';
export default function PrepSchedule(): React.JSX.Element {
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);

  // Selected items
  const [selectedRecipe, setSelectedRecipe] = useState<BatchRecipe | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<PrepScheduleItem | null>(null);

  // Form state for create
  const [createQuantity, setCreateQuantity] = useState('');

  // Form state for update
  const [updateStatus, setUpdateStatus] = useState<'in_progress' | 'completed'>('in_progress');
  const [updateActualTime, setUpdateActualTime] = useState('');
  const [updateBatchCount, setUpdateBatchCount] = useState('');

  // Snackbar
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  // Queries & mutations - Batch Recipes
  const {
    recipes: batchRecipes,
    loading: loadingRecipes,
    error: errorRecipes,
  } = useBatchRecipesForSchedule();

  // Queries & mutations - Prep Schedule
  const {
    schedule: scheduleItems,
    loading: loadingSchedule,
    error: errorSchedule,
    refresh: refreshSchedule,
    createPrep,
    creating,
    updatePrep,
    updating,
    deletePrep,
    deleting,
  } = usePrepSchedule({ prep_date: selectedDate });

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshSchedule();
    setRefreshing(false);
  }, [refreshSchedule]);

  // Date helpers
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // Separate items by status
  const pendingItems = scheduleItems.filter(
    (item: PrepScheduleItem) => item.status !== 'completed'
  );
  const completedItems = scheduleItems.filter(
    (item: PrepScheduleItem) => item.status === 'completed'
  );

  // Stats
  const completedCount = completedItems.length;
  const completionRate =
    scheduleItems.length > 0 ? Math.round((completedCount / scheduleItems.length) * 100) : 0;

  // --- Create Dialog Handlers ---
  const openCreateDialog = (recipe: BatchRecipe) => {
    setSelectedRecipe(recipe);
    setCreateQuantity('');
    setShowCreateDialog(true);
  };

  const handleCreate = async () => {
    if (!selectedRecipe || !createQuantity) return;
    const qty = parseFloat(createQuantity);
    if (isNaN(qty) || qty <= 0) {
      setSnackbar({ visible: true, message: 'Please enter a valid quantity' });
      return;
    }

    try {
      await createPrep({
        batch_recipe_id: selectedRecipe.batch_recipe_id,
        scheduled_date: selectedDate,
        quantity_to_prep: qty,
      });
      setShowCreateDialog(false);
      setSnackbar({ visible: true, message: 'Prep schedule created' });
    } catch (e) {
      setSnackbar({ visible: true, message: 'Failed to create prep schedule' });
    }
  };

  // --- Update Dialog Handlers ---
  const openUpdateDialog = (item: PrepScheduleItem) => {
    setSelectedSchedule(item);
    setUpdateStatus(item.status === 'completed' ? 'completed' : 'in_progress');
    setUpdateActualTime('');
    setUpdateBatchCount('');
    setShowUpdateDialog(true);
  };

  const handleUpdate = async () => {
    if (!selectedSchedule) return;

    // Validate fields if completing
    if (updateStatus === 'completed') {
      const time = parseFloat(updateActualTime);
      const batchCount = parseInt(updateBatchCount, 10);
      if (isNaN(time) || time <= 0) {
        setSnackbar({ visible: true, message: 'Please enter a valid actual time' });
        return;
      }
      if (isNaN(batchCount) || batchCount <= 0) {
        setSnackbar({ visible: true, message: 'Please enter a valid batch count' });
        return;
      }

      try {
        await updatePrep({
          prep_id: selectedSchedule.prep_id,
          status: 'completed',
          prep_time_minutes_actual: time,
          prep_batch_count: batchCount,
        } as any);
        setShowUpdateDialog(false);
        setSnackbar({ visible: true, message: 'Prep schedule updated' });
      } catch (e) {
        setSnackbar({ visible: true, message: 'Failed to update prep schedule' });
      }
    } else {
      try {
        await updatePrep({
          prep_id: selectedSchedule.prep_id,
          status: 'in_progress',
        });
        setShowUpdateDialog(false);
        setSnackbar({ visible: true, message: 'Prep schedule updated' });
      } catch (e) {
        setSnackbar({ visible: true, message: 'Failed to update prep schedule' });
      }
    }
  };

  // --- Delete Handler ---
  const handleDelete = async (item: PrepScheduleItem) => {
    try {
      await deletePrep(item.prep_id);
      setSnackbar({ visible: true, message: 'Prep schedule deleted' });
    } catch (e) {
      setSnackbar({ visible: true, message: 'Failed to delete prep schedule' });
    }
  };

  // --- Render ---
  const isLoading = loadingRecipes || loadingSchedule;

  if (isLoading && batchRecipes.length === 0 && scheduleItems.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16 }}>Loading prep schedule...</Text>
      </View>
    );
  }

  const hasError = errorRecipes || errorSchedule;
  if (hasError) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <MaterialCommunityIcons name="alert-circle" size={48} color={theme.colors.error} />
        <Text style={{ marginTop: 16, color: theme.colors.error }}>
          Failed to load data. Please try again.
        </Text>
        <Button mode="contained" onPress={onRefresh} style={{ marginTop: 16 }}>
          Retry
        </Button>
      </View>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#4caf50';
      case 'in_progress':
        return '#2196f3';
      case 'scheduled':
        return '#ff9800';
      case 'cancelled':
        return '#f44336';
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <Surface style={styles.headerSurface} elevation={1}>
          <View style={styles.headerRow}>
            <MaterialCommunityIcons name="clipboard-check" size={28} color={theme.colors.primary} />
            <Text variant="titleLarge" style={{ marginLeft: 8, fontWeight: '600' }}>
              Prep Schedule
            </Text>
          </View>

          {/* Date Selector */}
          <SegmentedButtons
            value={selectedDate}
            onValueChange={setSelectedDate}
            buttons={[
              { value: today, label: 'Today' },
              { value: tomorrow, label: 'Tomorrow' },
            ]}
            style={styles.segmented}
          />

          {/* Progress Stats */}
          {scheduleItems.length > 0 && (
            <View style={styles.progressRow}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${completionRate}%`, backgroundColor: theme.colors.primary },
                  ]}
                />
              </View>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {completedCount}/{scheduleItems.length} completed ({completionRate}%)
              </Text>
            </View>
          )}
        </Surface>

        {/* Batch Recipes Section */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Batch Recipes
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}
          >
            Tap a recipe to schedule prep
          </Text>

          {batchRecipes.length === 0 ? (
            <Card mode="outlined" style={styles.emptyCard}>
              <Card.Content style={styles.emptyCardContent}>
                <MaterialCommunityIcons
                  name="clipboard-text-off"
                  size={32}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}
                >
                  No batch recipes found
                </Text>
              </Card.Content>
            </Card>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {batchRecipes.map((recipe: BatchRecipe) => (
                <Card
                  key={recipe.batch_recipe_id}
                  mode="outlined"
                  style={styles.recipeCard}
                  onPress={() => openCreateDialog(recipe)}
                >
                  <Card.Content>
                    <Text variant="titleSmall" style={{ fontWeight: '600' }} numberOfLines={1}>
                      {recipe.name}
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
                      numberOfLines={2}
                    >
                      {recipe.description || 'No description'}
                    </Text>
                    <View style={styles.recipeDetails}>
                      <Chip icon="scale" style={styles.recipeChip}>
                        {recipe.yield_quantity} {recipe.yield_unit}
                      </Chip>
                      {recipe.estimated_prep_time_minutes && (
                        <Chip icon="clock-outline" style={styles.recipeChip}>
                          {recipe.estimated_prep_time_minutes} min
                        </Chip>
                      )}
                    </View>
                  </Card.Content>
                </Card>
              ))}
            </ScrollView>
          )}
        </View>

        <Divider style={styles.divider} />

        {/* Current Prep Schedules Section */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Current Prep Schedules
          </Text>

          {scheduleItems.length === 0 ? (
            <Card mode="outlined" style={styles.emptyCard}>
              <Card.Content style={styles.emptyCardContent}>
                <MaterialCommunityIcons
                  name="calendar-blank"
                  size={32}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}
                >
                  No prep items scheduled for {selectedDate === today ? 'today' : 'tomorrow'}
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
                >
                  Tap a batch recipe above to add one
                </Text>
              </Card.Content>
            </Card>
          ) : (
            <>
              {/* Pending Items */}
              {pendingItems.length > 0 && (
                <View style={styles.statusSection}>
                  <View style={styles.statusHeader}>
                    <MaterialCommunityIcons name="clock-outline" size={18} color="#ff9800" />
                    <Text variant="titleSmall" style={{ marginLeft: 8, fontWeight: '600' }}>
                      Pending
                    </Text>
                    <Chip style={styles.countChip}>{pendingItems.length}</Chip>
                  </View>
                  {pendingItems.map((item: PrepScheduleItem) => (
                    <Card key={item.prep_id} mode="outlined" style={styles.scheduleCard}>
                      <Card.Content>
                        <View style={styles.scheduleHeader}>
                          <View style={{ flex: 1 }}>
                            <Text variant="titleSmall" style={{ fontWeight: '600' }}>
                              {item.batch_recipe_name || 'Unknown Recipe'}
                            </Text>
                            <Text
                              variant="bodySmall"
                              style={{ color: theme.colors.onSurfaceVariant }}
                            >
                              {new Date(item.scheduled_date).toLocaleDateString()}
                            </Text>
                          </View>
                          <Chip
                            style={{ backgroundColor: getStatusColor(item.status) + '20' }}
                            textStyle={{ color: getStatusColor(item.status) }}
                          >
                            {item.status}
                          </Chip>
                        </View>

                        <View style={styles.scheduleDetails}>
                          <View style={styles.detailItem}>
                            <Text
                              variant="labelSmall"
                              style={{ color: theme.colors.onSurfaceVariant }}
                            >
                              Qty Needed
                            </Text>
                            <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                              {item.quantity_to_prep}
                            </Text>
                          </View>
                          <View style={styles.detailItem}>
                            <Text
                              variant="labelSmall"
                              style={{ color: theme.colors.onSurfaceVariant }}
                            >
                              Qty Prepped
                            </Text>
                            <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                              {item.quantity_prepped ?? '-'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.cardActions}>
                          <Button
                            mode="outlined"
                            onPress={() => openUpdateDialog(item)}
                            style={styles.actionButton}
                          >
                            Update
                          </Button>
                          <IconButton
                            icon="delete"
                            iconColor="#f44336"
                            size={20}
                            onPress={() => handleDelete(item)}
                          />
                        </View>
                      </Card.Content>
                    </Card>
                  ))}
                </View>
              )}

              {/* Completed Items */}
              {completedItems.length > 0 && (
                <View style={styles.statusSection}>
                  <View style={styles.statusHeader}>
                    <MaterialCommunityIcons name="check-circle" size={18} color="#4caf50" />
                    <Text variant="titleSmall" style={{ marginLeft: 8, fontWeight: '600' }}>
                      Completed
                    </Text>
                    <Chip style={styles.countChip}>{completedItems.length}</Chip>
                  </View>
                  {completedItems.map((item: PrepScheduleItem) => (
                    <Card
                      key={item.prep_id}
                      mode="outlined"
                      style={[styles.scheduleCard, styles.completedCard]}
                    >
                      <Card.Content>
                        <View style={styles.scheduleHeader}>
                          <View style={{ flex: 1 }}>
                            <Text variant="titleSmall" style={{ fontWeight: '600' }}>
                              {item.batch_recipe_name || 'Unknown Recipe'}
                            </Text>
                            <Text
                              variant="bodySmall"
                              style={{ color: theme.colors.onSurfaceVariant }}
                            >
                              {new Date(item.scheduled_date).toLocaleDateString()}
                            </Text>
                          </View>
                          <Chip
                            style={{ backgroundColor: '#4caf5020' }}
                            textStyle={{ color: '#4caf50' }}
                          >
                            completed
                          </Chip>
                        </View>

                        <View style={styles.scheduleDetails}>
                          <View style={styles.detailItem}>
                            <Text
                              variant="labelSmall"
                              style={{ color: theme.colors.onSurfaceVariant }}
                            >
                              Qty Needed
                            </Text>
                            <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                              {item.quantity_to_prep}
                            </Text>
                          </View>
                          <View style={styles.detailItem}>
                            <Text
                              variant="labelSmall"
                              style={{ color: theme.colors.onSurfaceVariant }}
                            >
                              Qty Prepped
                            </Text>
                            <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                              {item.quantity_prepped ?? '-'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.cardActions}>
                          <Button
                            mode="text"
                            onPress={() => openUpdateDialog(item)}
                            style={styles.actionButton}
                          >
                            View Details
                          </Button>
                          <IconButton
                            icon="delete"
                            iconColor="#f44336"
                            size={20}
                            onPress={() => handleDelete(item)}
                          />
                        </View>
                      </Card.Content>
                    </Card>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => {
          if (batchRecipes.length > 0) {
            openCreateDialog(batchRecipes[0]);
          } else {
            setSnackbar({ visible: true, message: 'No batch recipes available' });
          }
        }}
      />

      {/* Create Dialog */}
      <Portal>
        <Dialog visible={showCreateDialog} onDismiss={() => setShowCreateDialog(false)}>
          <Dialog.Title>Create New Prep Schedule</Dialog.Title>
          <Dialog.Content>
            {selectedRecipe && (
              <>
                <Text variant="titleMedium" style={{ fontWeight: '600' }}>
                  {selectedRecipe.name}
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}
                >
                  Yield: {selectedRecipe.yield_quantity} {selectedRecipe.yield_unit}
                </Text>
              </>
            )}
            <TextInput
              label="Quantity Needed *"
              value={createQuantity}
              onChangeText={setCreateQuantity}
              mode="outlined"
              keyboardType="decimal-pad"
              style={styles.input}
              autoFocus
            />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Scheduling for: {selectedDate === today ? 'Today' : 'Tomorrow'} ({selectedDate})
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button
              mode="contained"
              onPress={handleCreate}
              loading={creating}
              disabled={!createQuantity || creating}
            >
              Create
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Update Dialog */}
      <Portal>
        <Dialog visible={showUpdateDialog} onDismiss={() => setShowUpdateDialog(false)}>
          <Dialog.Title>Update Prep Schedule</Dialog.Title>
          <Dialog.Content>
            {selectedSchedule && (
              <>
                <Text variant="titleMedium" style={{ fontWeight: '600' }}>
                  {selectedSchedule.batch_recipe_name || 'Unknown Recipe'}
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}
                >
                  Scheduled: {new Date(selectedSchedule.scheduled_date).toLocaleDateString()}
                </Text>
              </>
            )}

            {/* Status Toggle */}
            <Text variant="labelMedium" style={{ marginBottom: 8 }}>
              Status
            </Text>
            <SegmentedButtons
              value={updateStatus}
              onValueChange={value => setUpdateStatus(value as 'in_progress' | 'completed')}
              buttons={[
                { value: 'in_progress', label: 'In Progress' },
                { value: 'completed', label: 'Completed' },
              ]}
              style={{ marginBottom: 16 }}
            />

            {/* Completion Fields */}
            {updateStatus === 'completed' && (
              <>
                <TextInput
                  label="Actual Prep Time (minutes) *"
                  value={updateActualTime}
                  onChangeText={setUpdateActualTime}
                  mode="outlined"
                  keyboardType="number-pad"
                  style={styles.input}
                />
                <TextInput
                  label="Batch Count *"
                  value={updateBatchCount}
                  onChangeText={setUpdateBatchCount}
                  mode="outlined"
                  keyboardType="number-pad"
                  style={styles.input}
                />
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowUpdateDialog(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleUpdate} loading={updating} disabled={updating}>
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

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
  scrollContent: {
    paddingBottom: 100,
  },
  headerSurface: {
    padding: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  segmented: {
    marginBottom: 12,
  },
  progressRow: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  divider: {
    marginHorizontal: 16,
  },
  emptyCard: {
    marginTop: 8,
  },
  emptyCardContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  recipeCard: {
    width: 200,
    marginRight: 12,
  },
  recipeDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 4,
  },
  recipeChip: {
    marginRight: 4,
  },
  statusSection: {
    marginTop: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  countChip: {
    marginLeft: 'auto',
  },
  scheduleCard: {
    marginBottom: 8,
  },
  completedCard: {
    opacity: 0.8,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  scheduleDetails: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  actionButton: {
    marginRight: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  input: {
    marginBottom: 12,
  },
});
