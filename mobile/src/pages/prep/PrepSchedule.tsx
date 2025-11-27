// src/pages/prep/PrepSchedule.tsx
import React, { useState, useCallback, useContext } from 'react';
import { View, StyleSheet, SectionList, RefreshControl } from 'react-native';
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
  Checkbox,
  useTheme,
  SegmentedButtons,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { usePrepSchedule } from '../../hooks/usePrep';
import { AuthContext } from '../../contexts/AuthContext';
import { PrepScheduleItem } from '../../interfaces/prep';

interface PrepSection {
  title: string;
  data: PrepScheduleItem[];
}

export default function PrepSchedule(): React.JSX.Element {
  const theme = useTheme();
  const { tier } = useContext(AuthContext) || {};
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<PrepScheduleItem | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    batch_recipe_id: 0,
    quantity_to_prep: '',
    notes: '',
  });

  // Queries & mutations
  const {
    schedule: scheduleItems,
    loading: isLoading,
    refresh,
    createPrep,
    creating,
    updatePrep,
    updating,
    deletePrep,
    deleting,
    completePrep,
    completing,
  } = usePrepSchedule({ prep_date: selectedDate });

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refresh();
    setRefreshing(false);
  }, [refresh]);

  // Date helpers
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  
  // Group by status
  const sections: PrepSection[] = React.useMemo(() => {
    const pending = scheduleItems.filter((item: PrepScheduleItem) => item.status !== 'completed');
    const completed = scheduleItems.filter((item: PrepScheduleItem) => item.status === 'completed');

    const result: PrepSection[] = [];
    if (pending.length > 0) {
      result.push({ title: 'Pending', data: pending });
    }
    if (completed.length > 0) {
      result.push({ title: 'Completed', data: completed });
    }
    return result;
  }, [scheduleItems]);

  // Toggle completion
  const handleToggleComplete = async (item: PrepScheduleItem) => {
    const newStatus = item.status === 'completed' ? 'scheduled' : 'completed';
    await updatePrep({
      prep_id: item.prep_id,
      status: newStatus,
    });
  };

  // Open create dialog
  const openCreate = () => {
    setFormData({ batch_recipe_id: 0, quantity_to_prep: '', notes: '' });
    setShowCreateDialog(true);
  };

  // Handle create
  const handleCreate = async () => {
    if (!formData.batch_recipe_id || !formData.quantity_to_prep) return;
    await createPrep({
      batch_recipe_id: formData.batch_recipe_id,
      scheduled_date: selectedDate,
      quantity_to_prep: parseFloat(formData.quantity_to_prep),
      notes: formData.notes || undefined,
    });
    setShowCreateDialog(false);
  };

  // Handle delete
  const handleDelete = async (item: PrepScheduleItem) => {
    await deletePrep(item.prep_id);
  };

  // Stats
  const completedCount = scheduleItems.filter((i: PrepScheduleItem) => i.status === 'completed').length;
  const pendingCount = scheduleItems.length - completedCount;
  const completionRate = scheduleItems.length > 0
    ? Math.round((completedCount / scheduleItems.length) * 100)
    : 0;

  const renderSectionHeader = ({ section }: { section: PrepSection }) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.colors.background }]}>
      <MaterialCommunityIcons
        name={section.title === 'Pending' ? 'clock-outline' : 'check-circle'}
        size={18}
        color={section.title === 'Pending' ? '#ff9800' : '#4caf50'}
      />
      <Text variant="titleSmall" style={styles.sectionTitle}>
        {section.title}
      </Text>
      <Chip compact style={styles.countChip}>
        {section.data.length}
      </Chip>
    </View>
  );

  const renderItem = ({ item }: { item: PrepScheduleItem }) => (
    <Card style={[styles.card, item.status === 'completed' && styles.completedCard]} mode="outlined">
      <Card.Content style={styles.cardContent}>
        <Checkbox
          status={item.status === 'completed' ? 'checked' : 'unchecked'}
          onPress={() => handleToggleComplete(item)}
        />

        <View style={styles.itemInfo}>
          <Text
            variant="titleSmall"
            style={[styles.itemName, item.status === 'completed' && styles.completedText]}
            numberOfLines={1}
          >
            {item.batch_recipe_name || 'Prep Item'}
          </Text>
          <View style={styles.detailRow}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {item.quantity_to_prep} to prep
            </Text>
            {item.scheduled_date && (
              <>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}> • </Text>
                <MaterialCommunityIcons name="calendar" size={12} color={theme.colors.onSurfaceVariant} />
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 2 }}>
                  {new Date(item.scheduled_date).toLocaleDateString()}
                </Text>
              </>
            )}
          </View>
          {item.notes && (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }} numberOfLines={1}>
              {item.notes}
            </Text>
          )}
        </View>

        <IconButton
          icon="delete"
          size={18}
          iconColor="#f44336"
          onPress={() => handleDelete(item)}
        />
      </Card.Content>
    </Card>
  );

  if (isLoading && scheduleItems.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16 }}>Loading prep schedule...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <Surface style={styles.headerSurface} elevation={1}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons name="clipboard-check" size={28} color={theme.colors.primary} />
            <Text variant="titleLarge" style={{ marginLeft: 8, fontWeight: '600' }}>
              Prep Schedule
            </Text>
          </View>
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
      </Surface>

      {/* Schedule List */}
      {sections.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="clipboard-text-off"
            size={64}
            color={theme.colors.onSurfaceVariant}
          />
          <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>
            No prep items scheduled
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
            Add items to your prep schedule
          </Text>
          <Button mode="contained" onPress={openCreate} style={{ marginTop: 16 }}>
            Add Prep Item
          </Button>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.prep_id.toString()}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          stickySectionHeadersEnabled
        />
      )}

      {/* FAB */}
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={openCreate}
      />

      {/* Create Dialog */}
      <Portal>
        <Dialog visible={showCreateDialog} onDismiss={() => setShowCreateDialog(false)}>
          <Dialog.Title>Add Prep Item</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Batch Recipe ID *"
              value={formData.batch_recipe_id ? formData.batch_recipe_id.toString() : ''}
              onChangeText={text => setFormData(f => ({ ...f, batch_recipe_id: parseInt(text) || 0 }))}
              mode="outlined"
              keyboardType="number-pad"
              style={styles.input}
            />
            <TextInput
              label="Quantity to Prep *"
              value={formData.quantity_to_prep}
              onChangeText={text => setFormData(f => ({ ...f, quantity_to_prep: text }))}
              mode="outlined"
              keyboardType="decimal-pad"
              style={styles.input}
            />
            <TextInput
              label="Notes"
              value={formData.notes}
              onChangeText={text => setFormData(f => ({ ...f, notes: text }))}
              mode="outlined"
              multiline
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button
              mode="contained"
              onPress={handleCreate}
              loading={creating}
              disabled={!formData.batch_recipe_id || !formData.quantity_to_prep}
            >
              Add
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  },
  headerSurface: {
    padding: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    flex: 1,
    marginLeft: 8,
    fontWeight: '600',
  },
  countChip: {
    height: 22,
  },
  card: {
    marginBottom: 8,
  },
  completedCard: {
    opacity: 0.7,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 8,
  },
  itemName: {
    fontWeight: '600',
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
});
