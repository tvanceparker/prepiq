// src/pages/prep/PrepLogs.tsx
import React, { useState, useMemo } from 'react';
import { View, StyleSheet, SectionList } from 'react-native';
import {
  Text,
  useTheme,
  Card,
  Chip,
  Searchbar,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import { usePrepSchedule } from '../../hooks/usePrep';
import type { PrepScheduleItem } from '../../interfaces/prep';

export default function PrepLogs() {
  const theme = useTheme();
  const { schedule, loading } = usePrepSchedule();
  const [search, setSearch] = useState('');

  // Filter to only show completed items (as logs)
  const completedItems = useMemo(() => {
    if (!schedule) return [];
    const completed = schedule.filter((item: PrepScheduleItem) => item.status === 'completed');
    const q = search.toLowerCase();
    if (!q) return completed;
    return completed.filter(
      (item: PrepScheduleItem) =>
        item.batch_recipe_name?.toLowerCase().includes(q)
    );
  }, [schedule, search]);

  // Group by completion date
  const sections = useMemo(() => {
    const grouped: Record<string, PrepScheduleItem[]> = {};
    completedItems.forEach((item: PrepScheduleItem) => {
      const dateKey = item.completed_at
        ? new Date(item.completed_at).toLocaleDateString()
        : item.scheduled_date || 'Unknown';
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(item);
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
      .map(([title, data]) => ({ title, data }));
  }, [completedItems]);

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ color: theme.colors.onBackground }}>
          Prep Logs
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          History of completed prep tasks
        </Text>
      </View>

      <Searchbar
        placeholder="Search prep logs..."
        value={search}
        onChangeText={setSearch}
        style={styles.searchbar}
      />

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : sections.length === 0 ? (
        <Card style={styles.emptyCard} mode="outlined">
          <Card.Content style={styles.emptyContent}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              {search ? 'No matching logs' : 'No completed prep tasks yet'}
            </Text>
          </Card.Content>
        </Card>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.prep_id)}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {section.title}
              </Text>
              <Chip compact icon="check-circle">
                {section.data.length} completed
              </Chip>
            </View>
          )}
          renderItem={({ item }) => (
            <Card style={styles.logCard} mode="outlined">
              <Card.Content>
                <View style={styles.logRow}>
                  <View style={styles.logInfo}>
                    <Text variant="titleMedium">{item.batch_recipe_name}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Qty: {item.quantity_to_prep}
                    </Text>
                  </View>
                  <View style={styles.logMeta}>
                    {item.completed_at && (
                      <Chip compact icon="clock-check-outline">
                        {formatTime(item.completed_at)}
                      </Chip>
                    )}
                    {item.assigned_employee_name && (
                      <Text
                        variant="bodySmall"
                        style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
                      >
                        By: {item.assigned_employee_name}
                      </Text>
                    )}
                  </View>
                </View>
                {item.notes && (
                  <>
                    <Divider style={{ marginVertical: 8 }} />
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Notes: {item.notes}
                    </Text>
                  </>
                )}
              </Card.Content>
            </Card>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
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
  searchbar: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
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
  logCard: {
    marginBottom: 8,
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logInfo: {
    flex: 1,
  },
  logMeta: {
    alignItems: 'flex-end',
  },
  emptyCard: {
    margin: 16,
    marginTop: 32,
  },
  emptyContent: {
    alignItems: 'center',
    padding: 32,
  },
});
