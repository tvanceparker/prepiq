// src/pages/team/ShiftManager.tsx
import React from 'react';
import { View, StyleSheet, ScrollView, SectionList } from 'react-native';
import {
  Text,
  useTheme,
  Card,
  Button,
  Chip,
  FAB,
  Portal,
  Dialog,
  TextInput,
  Snackbar,
  ActivityIndicator,
  IconButton,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useShiftManager, ShiftSection } from './hooks';
import { ShiftCard } from './components';
import type { ShiftSchedule, Employee } from '../../interfaces/team';

export default function ShiftManager() {
  const theme = useTheme();

  const {
    // State
    dialogOpen,
    editingShift,
    formData,
    snackbar,
    // Data
    shifts,
    sections,
    employees,
    loading,
    creating,
    updating,
    currentWeekStart,
    weekDisplayText,
    SHIFT_TYPES,
    // Actions
    openCreate,
    openEdit,
    closeDialog,
    handleSave,
    handleDelete,
    updateFormField,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    dismissSnackbar,
    // Helpers
    getEmployeeName,
  } = useShiftManager();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ color: theme.colors.onBackground }}>
          Shift Manager
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Manage weekly shift schedules
        </Text>
      </View>

      {/* Week Navigation */}
      <View style={styles.weekNav}>
        <IconButton icon="chevron-left" onPress={goToPreviousWeek} />
        <Button mode="text" onPress={goToCurrentWeek}>
          {weekDisplayText}
        </Button>
        <IconButton icon="chevron-right" onPress={goToNextWeek} />
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : sections.length === 0 ? (
        <Card style={styles.emptyCard} mode="outlined">
          <Card.Content style={styles.emptyContent}>
            <MaterialCommunityIcons
              name="calendar-blank"
              size={48}
              color={theme.colors.onSurfaceVariant}
            />
            <Text
              variant="bodyLarge"
              style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}
            >
              No shifts scheduled
            </Text>
            <Button mode="contained" onPress={openCreate} style={{ marginTop: 16 }}>
              Create First Shift
            </Button>
          </Card.Content>
        </Card>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => String(item.shift_id)}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {section.title}
              </Text>
              <Chip compact>{section.data.length} shifts</Chip>
            </View>
          )}
          renderItem={({ item }) => (
            <ShiftCard
              shift={item}
              employeeName={getEmployeeName(item.employee_id)}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      <FAB icon="plus" style={styles.fab} onPress={openCreate} label="Add Shift" />

      {/* Create/Edit Dialog */}
      <Portal>
        <Dialog visible={dialogOpen} onDismiss={closeDialog}>
          <Dialog.Title>{editingShift ? 'Edit Shift' : 'New Shift'}</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView contentContainerStyle={styles.dialogContent}>
              <Text variant="labelMedium" style={styles.dialogLabel}>
                Employee
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.empScroll}
              >
                {(employees || []).map((emp: Employee) => (
                  <Chip
                    key={emp.employee_id}
                    selected={formData.employee_id === emp.employee_id}
                    onPress={() => updateFormField('employee_id', emp.employee_id)}
                    style={styles.empChip}
                    showSelectedCheck
                  >
                    {emp.name}
                  </Chip>
                ))}
              </ScrollView>

              <Text variant="labelMedium" style={styles.dialogLabel}>
                Shift Date
              </Text>
              <TextInput
                label="Shift Date (YYYY-MM-DD)"
                value={formData.shift_date}
                onChangeText={text => updateFormField('shift_date', text)}
                mode="outlined"
                style={{ marginBottom: 16 }}
                placeholder="2024-01-01"
              />

              <Text variant="labelMedium" style={styles.dialogLabel}>
                Shift Type
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.typeScroll}
              >
                {SHIFT_TYPES.map(type => (
                  <Chip
                    key={type}
                    selected={formData.shift_type === type}
                    onPress={() => updateFormField('shift_type', type)}
                    style={styles.typeChip}
                    showSelectedCheck
                  >
                    {type.replace('_', ' ')}
                  </Chip>
                ))}
              </ScrollView>

              <View style={styles.timeRow}>
                <TextInput
                  label="Start Time"
                  value={formData.start_time}
                  onChangeText={text => updateFormField('start_time', text)}
                  mode="outlined"
                  style={styles.timeInput}
                  placeholder="09:00"
                />
                <TextInput
                  label="End Time"
                  value={formData.end_time}
                  onChangeText={text => updateFormField('end_time', text)}
                  mode="outlined"
                  style={styles.timeInput}
                  placeholder="17:00"
                />
              </View>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={closeDialog}>Cancel</Button>
            <Button mode="contained" onPress={handleSave} loading={creating || updating}>
              {editingShift ? 'Update' : 'Create'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={snackbar.visible} onDismiss={dismissSnackbar} duration={3000}>
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
  weekNav: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
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
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  dialogContent: {
    padding: 16,
  },
  dialogLabel: {
    marginTop: 12,
    marginBottom: 8,
  },
  empScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  empChip: {
    marginRight: 8,
  },
  typeScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  typeChip: {
    marginRight: 8,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  timeInput: {
    flex: 1,
  },
});
