// src/pages/team/ClockInLog.tsx
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
  useTheme,
  SegmentedButtons,
  Avatar,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useClockEvents, useEmployees } from '../../hooks/useTeam';
import { AuthContext } from '../../contexts/AuthContext';
import { ClockEvent, Employee } from '../../interfaces/team';

interface ClockSection {
  title: string;
  data: ClockEvent[];
}

export default function ClockInLog(): React.ReactElement {
  const theme = useTheme();
  const { user } = useContext(AuthContext) || {};
  const currentEmployeeId = user?.user_id || 0;
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<'today' | 'week'>('today');
  const [showClockDialog, setShowClockDialog] = useState(false);

  // Calculate date range
  const getDateRange = () => {
    const end = new Date();
    const start = new Date();

    if (dateRange === 'today') {
      start.setHours(0, 0, 0, 0);
    } else {
      start.setDate(start.getDate() - 7);
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  };

  const { startDate, endDate } = getDateRange();

  // Queries & mutations
  const {
    events: clockEvents = [],
    loading: isLoading,
    clockIn,
    clockingIn,
    clockOut,
    clockingOut,
    currentClockEvent,
    totalHours: workedHours,
  } = useClockEvents({ employeeId: currentEmployeeId, startDate, endDate });

  const { employees = [] } = useEmployees();

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // The hook will auto-refresh via query invalidation
    setRefreshing(false);
  }, []);

  // Get employee name
  const getEmployeeName = (employeeId: number) => {
    const emp = employees.find((e: Employee) => e.employee_id === employeeId);
    return emp?.name || 'Unknown';
  };

  // Check if current user is clocked in
  const isClockedIn = currentClockEvent && !currentClockEvent.clock_out;

  // Stats
  const stats = React.useMemo(() => {
    return {
      currentlyIn: isClockedIn ? 1 : 0,
      totalEvents: clockEvents.length,
      totalHours: workedHours.toFixed(1),
    };
  }, [clockEvents, isClockedIn, workedHours]);

  // Group by date
  const sections: ClockSection[] = React.useMemo(() => {
    const grouped: Record<string, ClockEvent[]> = {};

    clockEvents.forEach((event: ClockEvent) => {
      const date = event.clock_in?.split('T')[0] || 'Unknown Date';
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(event);
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
      .map(([title, data]) => ({
        title: new Date(title).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        }),
        data,
      }));
  }, [clockEvents]);

  // Handle clock in/out
  const handleClock = async (type: 'clock_in' | 'clock_out') => {
    if (!currentEmployeeId) return;

    if (type === 'clock_in') {
      await clockIn({ employeeId: currentEmployeeId });
    } else if (currentClockEvent) {
      await clockOut({ clockEventId: currentClockEvent.clock_event_id });
    }
    setShowClockDialog(false);
  };

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

  const renderItem = ({ item }: { item: ClockEvent }) => {
    const clockInTime = item.clock_in ? new Date(item.clock_in).toLocaleTimeString() : '--:--';
    const clockOutTime = item.clock_out ? new Date(item.clock_out).toLocaleTimeString() : 'Active';
    const isComplete = Boolean(item.clock_out);

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
              {item.employee_name || getEmployeeName(item.employee_id)}
            </Text>
            <View style={styles.timeRow}>
              <Chip
                compact
                style={[styles.typeChip, { backgroundColor: '#4caf50' }]}
                textStyle={{ color: '#fff', fontSize: 10 }}
              >
                IN: {clockInTime}
              </Chip>
              <Chip
                compact
                style={[styles.typeChip, { backgroundColor: isComplete ? '#f44336' : '#ff9800' }]}
                textStyle={{ color: '#fff', fontSize: 10 }}
              >
                OUT: {clockOutTime}
              </Chip>
            </View>
            {item.duration_hours !== undefined && (
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
              >
                Duration: {item.duration_hours.toFixed(1)} hours
              </Text>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

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
          onValueChange={value => setDateRange(value as any)}
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
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
  },
  employeeName: {
    fontWeight: '600',
  },
  typeChip: {
    alignSelf: 'flex-start',
    marginTop: 4,
    height: 20,
    marginRight: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timeSection: {
    flexDirection: 'row',
    alignItems: 'center',
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
