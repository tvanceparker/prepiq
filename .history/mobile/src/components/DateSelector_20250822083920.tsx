import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, FlatList } from 'react-native';
import { Button, Text, Menu, Divider } from 'react-native-paper';

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

      <CalendarModal
        visible={calendarVisible !== null}
        initialMonth={calendarVisible === 'start' ? startDate : endDate}
        onClose={() => setCalendarVisible(null)}
        onPick={(d: Date) => {
          if (calendarVisible === 'start') onStartDateChange(d);
          else if (calendarVisible === 'end') onEndDateChange(d);
          setCalendarVisible(null);
        }}
      />
    </View>
  );
}

function CalendarModal({ visible, initialMonth, onClose, onPick }: { visible: boolean; initialMonth: Date; onClose: () => void; onPick: (d: Date) => void }) {
  const [displayed, setDisplayed] = React.useState<Date>(() => { const d = new Date(initialMonth); d.setDate(1); return d; });
  const [yearMenuVisible, setYearMenuVisible] = React.useState(false);

  React.useEffect(() => {
    // when initialMonth changes, reset displayed month
    const d = new Date(initialMonth);
    d.setDate(1);
    setDisplayed(d);
  }, [initialMonth]);

  const monthStart = new Date(displayed);
  monthStart.setDate(1);
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }).map((_, i) => new Date(year, month, i + 1));

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }).map((_, i) => currentYear - 5 + i);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <View style={{ width: 320, backgroundColor: 'white', borderRadius: 8, padding: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => { const d = new Date(displayed); d.setMonth(d.getMonth() - 1); setDisplayed(d); }} style={{ padding: 8 }}>
                <Text>{'◀'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { const d = new Date(displayed); d.setMonth(d.getMonth() + 1); setDisplayed(d); }} style={{ padding: 8 }}>
                <Text>{'▶'}</Text>
              </TouchableOpacity>
            </View>
            <Menu visible={yearMenuVisible} onDismiss={() => setYearMenuVisible(false)} anchor={<Button mode="outlined" onPress={() => setYearMenuVisible(true)}>{displayed.getFullYear()}</Button>}>
              {years.map(y => (
                <Menu.Item key={y} title={String(y)} onPress={() => { const d = new Date(displayed); d.setFullYear(y); setDisplayed(d); setYearMenuVisible(false); }} />
              ))}
            </Menu>
          </View>
          <Text variant="titleMedium" style={{ marginBottom: 8 }}>{monthStart.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</Text>
          <Divider />
          <FlatList
            data={days}
            keyExtractor={(d) => d.toISOString()}
            numColumns={7}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => onPick(item)} style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center', margin: 4 }}>
                <Text>{item.getDate()}</Text>
              </TouchableOpacity>
            )}
          />
          <Divider />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
            <Button mode="outlined" onPress={onClose}>Cancel</Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', marginBottom: 16 },
  label: { marginBottom: 8, fontWeight: '600' },
  inputsRow: { flexDirection: 'row', gap: 12 },
  inputWrapper: { flex: 1 },
  pseudoInput: { borderWidth: 1, borderColor: '#d1d5db', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 6 },
});
