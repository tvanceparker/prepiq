// src/pages/team/components/ShiftCard.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Chip, IconButton, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ShiftSchedule } from '../../../interfaces/team';

interface ShiftCardProps {
  shift: ShiftSchedule;
  onEdit?: (shift: ShiftSchedule) => void;
  onDelete?: (shiftId: number) => void;
  getEmployeeName?: (employeeId: number) => string;
  getShiftTypeColor?: (shiftType: string) => string;
}

export function ShiftCard({
  shift,
  onEdit,
  onDelete,
  getEmployeeName,
  getShiftTypeColor,
}: ShiftCardProps): React.JSX.Element {
  const theme = useTheme();

  const defaultGetShiftTypeColor = (shiftType: string) => {
    switch (shiftType) {
      case 'morning':
        return '#ff9800';
      case 'afternoon':
        return '#2196f3';
      case 'evening':
        return '#9c27b0';
      case 'night':
        return '#3f51b5';
      case 'full_day':
        return '#4caf50';
      default:
        return '#757575';
    }
  };

  const employeeName =
    shift.employee_name ||
    (getEmployeeName ? getEmployeeName(shift.employee_id) : `Employee #${shift.employee_id}`);

  const typeColor = getShiftTypeColor
    ? getShiftTypeColor(shift.shift_type)
    : defaultGetShiftTypeColor(shift.shift_type);

  const formatTime = (time: string) => {
    // Handle HH:MM:SS or HH:MM format
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${suffix}`;
  };

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content style={styles.cardContent}>
        <View style={[styles.typeIndicator, { backgroundColor: typeColor }]} />

        <View style={styles.shiftInfo}>
          <Text variant="titleMedium" style={styles.employeeName}>
            {employeeName}
          </Text>

          <View style={styles.timeRow}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={14}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {formatTime(shift.shift_start_time)} – {formatTime(shift.shift_end_time)}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Chip
              compact
              style={[styles.typeChip, { backgroundColor: typeColor }]}
              textStyle={{ color: '#fff', fontSize: 10 }}
            >
              {shift.shift_type.replace('_', ' ').toUpperCase()}
            </Chip>
            {shift.duration_hours > 0 && (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {shift.duration_hours.toFixed(1)}h
              </Text>
            )}
          </View>

          {shift.notes && (
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, fontStyle: 'italic' }}
            >
              {shift.notes}
            </Text>
          )}
        </View>

        <View style={styles.actions}>
          {onEdit && <IconButton icon="pencil" size={20} onPress={() => onEdit(shift)} />}
          {onDelete && (
            <IconButton
              icon="delete"
              size={20}
              iconColor={theme.colors.error}
              onPress={() => onDelete(shift.shift_id)}
            />
          )}
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 8,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIndicator: {
    width: 4,
    height: '100%',
    minHeight: 60,
    borderRadius: 2,
  },
  shiftInfo: {
    flex: 1,
    marginLeft: 12,
  },
  employeeName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeChip: {
    height: 22,
  },
  actions: {
    flexDirection: 'row',
  },
});

export default ShiftCard;
