// src/pages/team/ShiftManager.tsx
import React, { useState } from 'react';
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
  SegmentedButtons,
  Snackbar,
  ActivityIndicator,
  List,
  IconButton,
} from 'react-native-paper';
import { useEmployees, useShiftSchedule } from '../../hooks/useTeam';
import { ShiftSchedule, Employee } from '../../interfaces/team';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function ShiftManager() {
  const theme = useTheme();
  const { employees, loading: isLoadingEmployees } = useEmployees();

  // Default to current week
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const {
    shifts,
    loading: isLoadingShifts,
    createShift,
    updateShift,
    deleteShift,
  } = useShiftSchedule({
    startDate: startOfWeek.toISOString().split('T')[0],
    endDate: endOfWeek.toISOString().split('T')[0],
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftSchedule | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const openCreate = () => {
    setEditingShift(null);
    setSelectedEmployee(null);
    setShiftDate(new Date().toISOString().split('T')[0]);
    setStartTime('09:00');
    setEndTime('17:00');
    setDialogOpen(true);
  };

  const openEdit = (shift: ShiftSchedule) => {
    setEditingShift(shift);
    setSelectedEmployee(shift.employee_id);
    setShiftDate(shift.shift_date);
    setStartTime(shift.shift_start_time);
    setEndTime(shift.shift_end_time);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedEmployee) {
      setSnackbar({ visible: true, message: 'Please select an employee' });
      return;
    }

    try {
      const data = {
        employee_id: selectedEmployee,
        shift_date: shiftDate,
        shift_start_time: startTime,
        shift_end_time: endTime,
        shift_type: 'regular',
      };

      if (editingShift) {
        await updateShift({ id: editingShift.shift_id, data });
        setSnackbar({ visible: true, message: 'Shift updated' });
      } else {
        await createShift(data);
        setSnackbar({ visible: true, message: 'Shift created' });
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      const error = err as Error;
      setSnackbar({ visible: true, message: error?.message || 'Failed to save shift' });
    }
  };

  const handleDelete = async (shiftId: number) => {
    try {
      await deleteShift(shiftId);
      setSnackbar({ visible: true, message: 'Shift deleted' });
    } catch (err: unknown) {
      const error = err as Error;
      setSnackbar({ visible: true, message: error?.message || 'Failed to delete' });
    }
  };

  // Group shifts by date
  const groupedShifts = (shifts || []).reduce((acc, shift: ShiftSchedule) => {
    const date = shift.shift_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(shift);
    return acc;
  }, {} as Record<string, ShiftSchedule[]>);

  const sections = Object.entries(groupedShifts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      title: new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }),
      data,
    }));

  const getEmployeeName = (employeeId: number) => {
    const emp = (employees || []).find((e: Employee) => e.employee_id === employeeId);
    return emp?.name || `Employee #${employeeId}`;
  };

  const loading = isLoadingShifts || isLoadingEmployees;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ color: theme.colors.onBackground }}>
          Shift Manager
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Manage weekly shift schedules
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : sections.length === 0 ? (
        <Card style={styles.emptyCard} mode="outlined">
          <Card.Content style={styles.emptyContent}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
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
            <Card style={styles.shiftCard} mode="outlined">
              <Card.Content style={styles.shiftContent}>
                <View style={styles.shiftInfo}>
                  <Text variant="titleMedium">{getEmployeeName(item.employee_id)}</Text>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    {item.shift_start_time} – {item.shift_end_time}
                  </Text>
                </View>
                <View style={styles.shiftActions}>
                  <IconButton icon="pencil" size={20} onPress={() => openEdit(item)} />
                  <IconButton
                    icon="delete"
                    size={20}
                    iconColor={theme.colors.error}
                    onPress={() => handleDelete(item.shift_id)}
                  />
                </View>
              </Card.Content>
            </Card>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      <FAB icon="plus" style={styles.fab} onPress={openCreate} label="Add Shift" />

      {/* Create/Edit Dialog */}
      <Portal>
        <Dialog visible={dialogOpen} onDismiss={() => setDialogOpen(false)}>
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
                    selected={selectedEmployee === emp.employee_id}
                    onPress={() => setSelectedEmployee(emp.employee_id)}
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
                value={shiftDate}
                onChangeText={setShiftDate}
                mode="outlined"
                style={{ marginBottom: 16 }}
                placeholder="2024-01-01"
              />

              <View style={styles.timeRow}>
                <TextInput
                  label="Start Time"
                  value={startTime}
                  onChangeText={setStartTime}
                  mode="outlined"
                  style={styles.timeInput}
                  placeholder="09:00"
                />
                <TextInput
                  label="End Time"
                  value={endTime}
                  onChangeText={setEndTime}
                  mode="outlined"
                  style={styles.timeInput}
                  placeholder="17:00"
                />
              </View>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setDialogOpen(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleSave}>
              {editingShift ? 'Update' : 'Create'}
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
  shiftCard: {
    marginBottom: 8,
  },
  shiftContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shiftInfo: {
    flex: 1,
  },
  shiftActions: {
    flexDirection: 'row',
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
  dayScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayChip: {
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
