// src/pages/team/ClockInLog.tsx
import React from 'react';
import { View, StyleSheet, SectionList, RefreshControl } from 'react-native';
import {
  Surface,
  Text,
  Button,
  Chip,
  ActivityIndicator,
  Portal,
  Dialog,
  useTheme,
  SegmentedButtons,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useClockInLog, ClockSection } from './hooks';
import { ClockEventCard } from './components';
import type { ClockEvent } from '../../interfaces/team';

export default function ClockInLog(): React.ReactElement {
  const theme = useTheme();

  const {
    // State
    currentEmployeeId,
    dateRange,
    showClockDialog,
    refreshing,
    // Data
    clockEvents,
    sections,
    stats,
    isClockedIn,
    loading: isLoading,
    clockingIn,
    clockingOut,
    // Actions
    setDateRange,
    setShowClockDialog,
    handleClock,
    onRefresh,
    getEmployeeName,
  } = useClockInLog();

  const renderSectionHeader = ({ section }: { section: ClockSection }) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.colors.background }]}>
      <MaterialCommunityIcons name="calendar" size={16} color={theme.colors.primary} />
      <Text variant="titleSmall" style={styles.sectionTitle}>
        {section.title}
      </Text>
      <Chip compact style={styles.countChip}>
        {section.data.length}
      </Chip>
    </View>
  );

  const renderItem = ({ item }: { item: ClockEvent }) => (
    <ClockEventCard event={item} employeeName={getEmployeeName(item.employee_id)} />
  );

  if (isLoading && clockEvents.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16 }}>Loading clock events...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <Surface style={styles.headerSurface} elevation={1}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons name="clock-check" size={28} color={theme.colors.primary} />
            <Text variant="titleLarge" style={{ marginLeft: 8, fontWeight: '600' }}>
              Time Clock
            </Text>
          </View>
          {currentEmployeeId ? (
            <Button
              mode="contained"
              onPress={() => setShowClockDialog(true)}
              icon={isClockedIn ? 'logout' : 'login'}
            >
              {isClockedIn ? 'Clock Out' : 'Clock In'}
            </Button>
          ) : null}
        </View>

        {/* Date Range Selector */}
        <SegmentedButtons
          value={dateRange}
          onValueChange={value => setDateRange(value as 'today' | 'week')}
          buttons={[
            { value: 'today', label: 'Today' },
            { value: 'week', label: 'This Week' },
          ]}
          style={styles.segmented}
        />

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text variant="titleMedium" style={{ color: '#4caf50', fontWeight: '700' }}>
              {stats.currentlyIn}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              On Clock
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="titleMedium" style={{ fontWeight: '700' }}>
              {stats.totalEvents}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Events
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: '700' }}>
              {stats.totalHours}h
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Worked
            </Text>
          </View>
        </View>
      </Surface>

      {/* Clock Events List */}
      {sections.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={64}
            color={theme.colors.onSurfaceVariant}
          />
          <Text
            variant="titleMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}
          >
            No clock events
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
            Clock in to get started
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.clock_event_id?.toString() || Math.random().toString()}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          stickySectionHeadersEnabled
        />
      )}

      {/* Clock In/Out Dialog */}
      <Portal>
        <Dialog visible={showClockDialog} onDismiss={() => setShowClockDialog(false)}>
          <Dialog.Title>Time Clock</Dialog.Title>
          <Dialog.Content>
            <View style={styles.clockDialogContent}>
              <Text variant="bodyLarge">
                Current status: {isClockedIn ? 'Clocked In' : 'Clocked Out'}
              </Text>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}
              >
                {new Date().toLocaleString()}
              </Text>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowClockDialog(false)}>Cancel</Button>
            {isClockedIn ? (
              <Button
                mode="contained"
                buttonColor="#f44336"
                onPress={() => handleClock('clock_out')}
                loading={clockingOut}
              >
                Clock Out
              </Button>
            ) : (
              <Button
                mode="contained"
                buttonColor="#4caf50"
                onPress={() => handleClock('clock_in')}
                loading={clockingIn}
              >
                Clock In
              </Button>
            )}
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statItem: {
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clockDialogContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
});
