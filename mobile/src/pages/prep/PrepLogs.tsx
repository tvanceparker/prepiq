// src/pages/prep/PrepLogs.tsx
import React from 'react';
import { View, StyleSheet, SectionList, RefreshControl } from 'react-native';
import {
  Text,
  useTheme,
  Surface,
  Searchbar,
  ActivityIndicator,
  Card,
  Chip,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { usePrepLogs } from './hooks/usePrepLogs';
import { PrepLogCard } from './components/PrepLogCard';
import { PrepLogFilters } from './components/PrepLogFilters';
import type { PrepLog } from '../../interfaces/prep';

interface PrepLogSection {
  title: string;
  data: PrepLog[];
}

export default function PrepLogs(): React.JSX.Element {
  const theme = useTheme();

  const {
    logs,
    sections,
    stats,
    batchRecipes,
    loading,
    refreshing,
    error,
    startDate,
    endDate,
    statusFilter,
    batchRecipeFilter,
    searchQuery,
    hasActiveFilters,
    setStartDate,
    setEndDate,
    setStatusFilter,
    setBatchRecipeFilter,
    setSearchQuery,
    onRefresh,
    clearFilters,
    getStatusColor,
    getStatusBgColor,
    getExpiryStatus,
    formatDate,
  } = usePrepLogs();

  const renderSectionHeader = ({ section }: { section: PrepLogSection }) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.colors.surfaceVariant }]}>
      <View style={styles.sectionTitleRow}>
        <MaterialCommunityIcons name="calendar" size={18} color={theme.colors.primary} />
        <Text variant="titleSmall" style={styles.sectionTitle}>
          {section.title}
        </Text>
      </View>
      <Chip compact icon="format-list-numbered">
        {section.data.length} {section.data.length === 1 ? 'entry' : 'entries'}
      </Chip>
    </View>
  );

  const renderItem = ({ item }: { item: PrepLog }) => (
    <PrepLogCard
      log={item}
      getStatusColor={getStatusColor}
      getStatusBgColor={getStatusBgColor}
      getExpiryStatus={getExpiryStatus}
      formatDate={formatDate}
    />
  );

  const renderEmptyState = () => (
    <Card style={styles.emptyCard} mode="outlined">
      <Card.Content style={styles.emptyContent}>
        <MaterialCommunityIcons
          name="clipboard-text-off"
          size={64}
          color={theme.colors.onSurfaceVariant}
        />
        <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>
          No prep logs found
        </Text>
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}
        >
          {hasActiveFilters
            ? 'Try adjusting your filters to see more results'
            : 'Completed prep tasks will appear here'}
        </Text>
        {hasActiveFilters && (
          <Chip icon="filter-off" style={{ marginTop: 16 }} onPress={clearFilters}>
            Clear Filters
          </Chip>
        )}
      </Card.Content>
    </Card>
  );

  const renderStatsHeader = () => (
    <Surface style={styles.statsContainer} elevation={1}>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text variant="headlineSmall" style={[styles.statValue, { color: '#4caf50' }]}>
            {stats.completed}
          </Text>
          <Text variant="labelSmall" style={styles.statLabel}>
            Completed
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text variant="headlineSmall" style={[styles.statValue, { color: '#ff9800' }]}>
            {stats.inProgress}
          </Text>
          <Text variant="labelSmall" style={styles.statLabel}>
            In Progress
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text variant="headlineSmall" style={[styles.statValue, { color: '#2196f3' }]}>
            {stats.scheduled}
          </Text>
          <Text variant="labelSmall" style={styles.statLabel}>
            Scheduled
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text variant="headlineSmall" style={styles.statValue}>
            {stats.total}
          </Text>
          <Text variant="labelSmall" style={styles.statLabel}>
            Total
          </Text>
        </View>
      </View>
    </Surface>
  );

  if (loading && logs.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16, color: theme.colors.onSurfaceVariant }}>
          Loading prep logs...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <MaterialCommunityIcons name="alert-circle" size={64} color="#f44336" />
        <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>
          Failed to load prep logs
        </Text>
        <Chip icon="refresh" style={{ marginTop: 16 }} onPress={onRefresh}>
          Try Again
        </Chip>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <Surface style={styles.headerSurface} elevation={1}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons
              name="clipboard-text-clock"
              size={28}
              color={theme.colors.primary}
            />
            <View style={styles.headerText}>
              <Text variant="titleLarge" style={{ fontWeight: '600' }}>
                Prep Logs
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Historical records of prep schedules
              </Text>
            </View>
          </View>
        </View>

        {/* Search */}
        <Searchbar
          placeholder="Search by recipe or employee..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchbar}
        />
      </Surface>

      {/* Filters */}
      <PrepLogFilters
        startDate={startDate}
        endDate={endDate}
        statusFilter={statusFilter}
        batchRecipeFilter={batchRecipeFilter}
        batchRecipes={batchRecipes}
        hasActiveFilters={hasActiveFilters}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onStatusChange={setStatusFilter}
        onBatchRecipeChange={setBatchRecipeFilter}
        onClearFilters={clearFilters}
      />

      {/* Content */}
      {sections.length === 0 ? (
        renderEmptyState()
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => String(item.prep_id)}
          renderSectionHeader={renderSectionHeader}
          renderItem={renderItem}
          ListHeaderComponent={renderStatsHeader}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
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
    padding: 20,
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
  headerText: {
    marginLeft: 12,
  },
  searchbar: {
    marginBottom: 0,
  },
  statsContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontWeight: '700',
  },
  statLabel: {
    color: '#757575',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#e0e0e0',
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
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    marginLeft: 8,
    fontWeight: '600',
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
