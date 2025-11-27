// src/pages/inventory/StockMovements.tsx
import React, { useState, useCallback, useContext } from 'react';
import { View, StyleSheet, SectionList, RefreshControl } from 'react-native';
import {
  Surface,
  Text,
  Searchbar,
  Card,
  Chip,
  ActivityIndicator,
  SegmentedButtons,
  useTheme,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useStockMovements } from '../../hooks/useStockMovements';
import { AuthContext } from '../../contexts/AuthContext';
import { StockMovement } from '../../interfaces/inventory';

interface MovementSection {
  title: string;
  data: StockMovement[];
}

export default function StockMovements(): React.JSX.Element {
  const theme = useTheme();
  const { tier } = useContext(AuthContext) || {};
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('week');

  // Calculate date range
  const getDateRange = () => {
    const end = new Date();
    const start = new Date();

    switch (dateRange) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  };

  const { startDate, endDate } = getDateRange();

  // Queries
  const {
    movements,
    loading: isLoading,
    sections: movementSections,
  } = useStockMovements({
    startDate,
    endDate,
  });

  // Pull to refresh - movements auto-refresh on date change
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Force date range recalculation by toggling state
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  // Filter movements
  const filteredMovements = React.useMemo(() => {
    let items = movements;

    if (typeFilter !== 'all') {
      items = items.filter((m: StockMovement) => m.type === typeFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (m: StockMovement) =>
          m.ingredient_name?.toLowerCase().includes(query) || m.notes?.toLowerCase().includes(query)
      );
    }

    return items;
  }, [movements, typeFilter, searchQuery]);

  // Group by date
  const sections: MovementSection[] = React.useMemo(() => {
    const grouped: Record<string, StockMovement[]> = {};

    filteredMovements.forEach((movement: StockMovement) => {
      const date = movement.date ? new Date(movement.date).toLocaleDateString() : 'Unknown Date';
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(movement);
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
      .map(([title, data]) => ({ title, data }));
  }, [filteredMovements]);

  // Movement type styling
  const getMovementStyle = (type: string) => {
    switch (type) {
      case 'purchase':
      case 'adjustment_add':
        return { icon: 'arrow-down', color: '#4caf50', label: 'IN' };
      case 'sale':
      case 'usage':
      case 'adjustment_remove':
        return { icon: 'arrow-up', color: '#f44336', label: 'OUT' };
      case 'waste':
        return { icon: 'delete', color: '#ff9800', label: 'WASTE' };
      case 'transfer':
        return { icon: 'swap-horizontal', color: '#2196f3', label: 'TRANSFER' };
      default:
        return { icon: 'help-circle', color: '#9e9e9e', label: type.toUpperCase() };
    }
  };

  // Stats
  const stats = React.useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let waste = 0;

    movements.forEach((m: StockMovement) => {
      const qty = m.quantity || 0;
      if (['Purchase', 'Adjustment'].includes(m.type)) {
        totalIn += qty;
      } else if (['Sale', 'Batch Production'].includes(m.type)) {
        totalOut += qty;
      } else if (m.type === 'Waste') {
        waste += qty;
      }
    });

    return { totalIn, totalOut, waste, count: movements.length };
  }, [movements]);

  const renderSectionHeader = ({ section }: { section: MovementSection }) => (
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

  const renderItem = ({ item }: { item: StockMovement }) => {
    const style = getMovementStyle(item.type);

    return (
      <Card style={styles.card} mode="outlined">
        <Card.Content style={styles.cardContent}>
          <View style={[styles.movementIndicator, { backgroundColor: style.color }]}>
            <MaterialCommunityIcons name={style.icon as any} size={20} color="#fff" />
          </View>

          <View style={styles.movementInfo}>
            <Text variant="titleSmall" style={styles.ingredientName} numberOfLines={1}>
              {item.ingredient_name || 'Unknown Item'}
            </Text>
            <View style={styles.detailRow}>
              <Chip
                compact
                style={[styles.typeChip, { backgroundColor: style.color }]}
                textStyle={{ color: '#fff', fontSize: 10 }}
              >
                {style.label}
              </Chip>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {item.date ? new Date(item.date).toLocaleTimeString() : '--:--'}
              </Text>
            </View>
            {item.notes && (
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
                numberOfLines={1}
              >
                {item.notes}
              </Text>
            )}
          </View>

          <View style={styles.quantitySection}>
            <Text
              variant="titleMedium"
              style={[
                styles.quantity,
                { color: ['Purchase', 'Adjustment'].includes(item.type) ? '#4caf50' : '#f44336' },
              ]}
            >
              {['Purchase', 'Adjustment'].includes(item.type) ? '+' : '-'}
              {item.quantity}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {item.unit || 'units'}
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (isLoading && movements.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16 }}>Loading stock movements...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <Surface style={styles.headerSurface} elevation={1}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons name="swap-vertical" size={28} color={theme.colors.primary} />
            <Text variant="titleLarge" style={{ marginLeft: 8, fontWeight: '600' }}>
              Stock Movements
            </Text>
          </View>
        </View>

        {/* Date Range Selector */}
        <SegmentedButtons
          value={dateRange}
          onValueChange={value => setDateRange(value as any)}
          buttons={[
            { value: 'today', label: 'Today' },
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' },
          ]}
          style={styles.segmented}
        />

        <Searchbar
          placeholder="Search movements..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchbar}
        />

        {/* Type Filter */}
        <View style={styles.filterRow}>
          {[
            { key: 'all', label: 'All' },
            { key: 'purchase', label: 'Purchases' },
            { key: 'usage', label: 'Usage' },
            { key: 'waste', label: 'Waste' },
          ].map(filter => (
            <Chip
              key={filter.key}
              selected={typeFilter === filter.key}
              onPress={() => setTypeFilter(filter.key)}
              style={styles.filterChip}
              showSelectedCheck={false}
              mode={typeFilter === filter.key ? 'flat' : 'outlined'}
            >
              {filter.label}
            </Chip>
          ))}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text variant="titleMedium" style={{ color: '#4caf50', fontWeight: '700' }}>
              +{stats.totalIn}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              In
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="titleMedium" style={{ color: '#f44336', fontWeight: '700' }}>
              -{stats.totalOut}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Out
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="titleMedium" style={{ color: '#ff9800', fontWeight: '700' }}>
              {stats.waste}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Waste
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text variant="titleMedium" style={{ fontWeight: '700' }}>
              {stats.count}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Total
            </Text>
          </View>
        </View>
      </Surface>

      {/* Movements List */}
      {sections.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="swap-vertical-variant"
            size={64}
            color={theme.colors.onSurfaceVariant}
          />
          <Text
            variant="titleMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}
          >
            No stock movements found
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
            Try adjusting your filters or date range
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => `${item.date}-${item.ingredient_id}-${index}`}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          stickySectionHeadersEnabled
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
  searchbar: {
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    marginBottom: 4,
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
  movementIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  movementInfo: {
    flex: 1,
    marginRight: 12,
  },
  ingredientName: {
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  typeChip: {
    height: 20,
  },
  quantitySection: {
    alignItems: 'flex-end',
  },
  quantity: {
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
