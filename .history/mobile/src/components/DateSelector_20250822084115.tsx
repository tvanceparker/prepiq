import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Button, Text, Menu, Divider } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';

// Simplified mobile DateSelector mirroring web presets
const presets = [
  { label: 'Today', days: 0 },
  { label: '3 Days', days: 3 },
  { label: '7 Days', days: 7 },
  { label: '14 Days', days: 14 },
  { label: '30 Days', days: 30 },
];

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0,0,0,0);
  return d;
}

function formatDate(date: Date) {
  return date.toISOString().split('T')[0];
}

interface Props {
  label?: string;
  startDate: Date;
  endDate: Date;
  onStartDateChange: (d: Date) => void;
  onEndDateChange: (d: Date) => void;
  mode?: 'range' | 'single';
  direction?: 'forward' | 'backward';
}

export default function DateSelector({ label, startDate, endDate, onStartDateChange, onEndDateChange, mode='range', direction='forward' }: Props) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState<null | 'start' | 'end'>(null);

  const applyPreset = (days: number) => {
    const today = startOfDay(new Date());
    if (direction === 'forward') {
      onStartDateChange(today);
      onEndDateChange(addDays(today, days > 0 ? days - 1 : 0));
    } else {
      onStartDateChange(addDays(today, days > 0 ? -(days - 1) : 0));
      onEndDateChange(today);
    }
    setMenuVisible(false);
  };

  return (
    <View style={styles.container}>
      {label && <Text variant="titleMedium" style={styles.label}>{label}</Text>}
      {mode !== 'single' && (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={<Button mode="outlined" onPress={() => setMenuVisible(true)}>{direction === 'forward' ? '→ Days' : '← Days'}</Button>}
          >
            {presets.map(p => (
              <Menu.Item key={p.label} title={(direction === 'forward' ? 'Next ' : 'Previous ') + p.label} onPress={() => applyPreset(p.days)} />
            ))}
          </Menu>
        </View>
      )}
      <View style={styles.inputsRow}>
        <View style={styles.inputWrapper}>
          <Text variant="labelSmall">{mode === 'single' ? 'Date' : 'Start Date'}</Text>
          <TouchableOpacity onPress={() => setCalendarVisible('start')} style={styles.pseudoInput}>
            <Text>{formatDate(startDate)}</Text>
          </TouchableOpacity>
        </View>
        {mode === 'range' && (
          <View style={styles.inputWrapper}>
            <Text variant="labelSmall">End Date</Text>
            <TouchableOpacity onPress={() => setCalendarVisible('end')} style={styles.pseudoInput}>
              <Text>{formatDate(endDate)}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Modal visible={calendarVisible !== null} transparent animationType="fade">
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ width: 340, backgroundColor: 'white', borderRadius: 8, padding: 12 }}>
            <Calendar
              current={calendarVisible === 'start' ? formatDate(startDate) : formatDate(endDate)}
              onDayPress={(day) => {
                const d = new Date(day.dateString + 'T00:00:00');
                if (calendarVisible === 'start') onStartDateChange(d);
                else onEndDateChange(d);
                setCalendarVisible(null);
              }}
              enableSwipeMonths
            />
            <Divider />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
              <Button mode="outlined" onPress={() => setCalendarVisible(null)}>Cancel</Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', marginBottom: 16 },
  label: { marginBottom: 8, fontWeight: '600' },
  inputsRow: { flexDirection: 'row', gap: 12 },
  inputWrapper: { flex: 1 },
  pseudoInput: { borderWidth: 1, borderColor: '#d1d5db', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 6 },
});
