import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, TextInput, Menu, Divider } from 'react-native-paper';

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
          <TextInput mode="outlined" value={formatDate(startDate)} onChangeText={(v) => {
            const d = new Date(v);
            if (!isNaN(d.getTime())) onStartDateChange(d);
          }} />
        </View>
        {mode === 'range' && (
          <View style={styles.inputWrapper}>
            <Text variant="labelSmall">End Date</Text>
            <TextInput mode="outlined" value={formatDate(endDate)} onChangeText={(v) => {
              const d = new Date(v);
              if (!isNaN(d.getTime())) onEndDateChange(d);
            }} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', marginBottom: 16 },
  label: { marginBottom: 8, fontWeight: '600' },
  inputsRow: { flexDirection: 'row', gap: 12 },
  inputWrapper: { flex: 1 },
});
