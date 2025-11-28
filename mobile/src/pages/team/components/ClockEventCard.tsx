// src/pages/team/components/ClockEventCard.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Chip, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ClockEvent } from '../../../interfaces/team';

interface ClockEventCardProps {
  event: ClockEvent;
  getEmployeeName?: (employeeId: number) => string;
  formatTime?: (dateStr: string | undefined | null) => string;
}

export function ClockEventCard({
  event,
  getEmployeeName,
  formatTime,
}: ClockEventCardProps): React.JSX.Element {
  const theme = useTheme();

  const defaultFormatTime = (dateStr: string | undefined | null) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const timeFormatter = formatTime || defaultFormatTime;
  const clockInTime = timeFormatter(event.clock_in);
  const clockOutTime = event.clock_out ? timeFormatter(event.clock_out) : 'Active';
  const isComplete = Boolean(event.clock_out);

  const employeeName =
    event.employee_name ||
    (getEmployeeName ? getEmployeeName(event.employee_id) : `Employee #${event.employee_id}`);

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content style={styles.cardContent}>
        <View
          style={[styles.eventIndicator, { backgroundColor: isComplete ? '#4caf50' : '#ff9800' }]}
        >
          <MaterialCommunityIcons
            name={isComplete ? 'check-circle' : 'clock-outline'}
            size={18}
            color="#fff"
          />
        </View>

        <View style={styles.eventInfo}>
          <Text variant="titleSmall" style={styles.employeeName}>
            {employeeName}
          </Text>
          <View style={styles.timeRow}>
            <Chip
              compact
              style={[styles.timeChip, { backgroundColor: '#4caf50' }]}
              textStyle={{ color: '#fff', fontSize: 10 }}
            >
              IN: {clockInTime}
            </Chip>
            <Chip
              compact
              style={[styles.timeChip, { backgroundColor: isComplete ? '#f44336' : '#ff9800' }]}
              textStyle={{ color: '#fff', fontSize: 10 }}
            >
              OUT: {clockOutTime}
            </Chip>
          </View>
          {event.duration_hours !== undefined && event.duration_hours > 0 && (
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
            >
              Duration: {event.duration_hours.toFixed(1)} hours
            </Text>
          )}
          {event.notes && (
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant, marginTop: 2, fontStyle: 'italic' }}
            >
              {event.notes}
            </Text>
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
  eventIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventInfo: {
    flex: 1,
    marginLeft: 12,
  },
  employeeName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  timeChip: {
    height: 22,
  },
});

export default ClockEventCard;
