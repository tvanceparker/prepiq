// src/pages/inventory/StockMovements.tsx
import React, { useState, useCallback, useContext } from 'react';
import { View, StyleSheet, SectionList, RefreshControl, ScrollView } from 'react-native';
import {
  Surface,
  Text,
  Searchbar,
  Card,
  Chip,
  ActivityIndicator,
  SegmentedButtons,
  useTheme,
  Divider,
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
    totalsByType,
  } = useStockMovements({
    startDate,
    endDate,
  });

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  // Get movement types from data
  const movementTypes = React.useMemo(() => {
    const types = new Set<string>();
    movements.forEach(m => types.add(m.type));
    return ['all', ...Array.from(types)];
  }, [movements]);

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
  const getMovementStyle = (type: string, qty: number) => {
    // Handle positive quantity types
    if (type === 'Purchase' || type === 'Adjustment' || qty > 0) {
      return { icon: 'arrow-down-bold', color: '#4caf50', bgColor: '#e8f5e9' };
    }
    // Handle negative quantity types
    if (type === 'Sale' || type === 'Batch Production') {
      return { icon: 'arrow-up-bold', color: '#2196f3', bgColor: '#e3f2fd' };
    }
    if (type === 'Waste') {
      return { icon: 'delete-outline', color: '#ff9800', bgColor: '#fff3e0' };
    }
    return { icon: 'swap-horizontal', color: '#9e9e9e', bgColor: '#f5f5f5' };
  };

  // Calculate stats from movements
  const stats = React.useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let waste = 0;

    movements.forEach((m: StockMovement) => {
      const qty = Math.abs(m.quantity || 0);
      if (m.type === 'Purchase' || m.type === 'Adjustment') {
        totalIn += qty;
      } else if (m.type === 'Sale' || m.type === 'Batch Production') {
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
      <View style={styles.sectionCount}>
        <Text variant="labelSmall">{section.data.length}</Text>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: StockMovement }) => {
    const style = getMovementStyle(item.type, item.quantity);
    const isPositive = item.type === 'Purchase' || item.type === 'Adjustment' || item.quantity > 0;

    return (
      <Card style={styles.card} mode="outlined">
        <Card.Content style={styles.cardContent}>
          <View style={[styles.movementIndicator, { backgroundColor: style.bgColor }]}>
            <MaterialCommunityIcons name={style.icon as any} size={20} color={style.color} />
          </View>

          <View style={styles.movementInfo}>
            <Text variant="titleSmall" style={styles.ingredientName} numberOfLines={1}>
              {item.ingredient_name || 'Unknown Item'}
            </Text>
            <View style={styles.detailRow}>
              <View style={[styles.typeBadge, { backgroundColor: style.bgColor }]}>
                <Text variant="labelSmall" style={{ color: style.color }}>
                  {item.type}
                </Text>
              </View>
              {item.source_or_destination && (
                <Text
                  variant="labelSmall"
                  style={{ color: theme.colors.onSurfaceVariant, marginLeft: 8 }}
                  numberOfLines={1}
                >
                  {item.source_or_destination}
                </Text>
              )}
            </View>
            {item.notes && (
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
                numberOfLines={1}
              >
                📝 {item.notes}
              </Text>
            )}
          </View>

          <View style={styles.quantitySection}>
            <Text
              variant="titleMedium"
              style={[styles.quantity, { color: isPositive ? '#4caf50' : '#f44336' }]}
            >
              {isPositive ? '+' : ''}{item.quantity}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {item.unit || 'units'}
            </Text>
            {item.running_balance !== null && item.running_balance !== undefined && (
              <Text variant="labelSmall" style={{ color: theme.colors.outline, marginTop: 2 }}>
                Bal: {item.running_balance}
              </Text>
            )}
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {movementTypes.map(type => (
            <Chip
              key={type}
              selected={typeFilter === type}
              onPress={() => setTypeFilter(type)}
              style={styles.filterChip}
              showSelectedCheck={false}
              mode={typeFilter === type ? 'flat' : 'outlined'}
            >
              {type === 'all' ? 'All' : type}
            </Chip>
          ))}
        </ScrollView>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="arrow-down-bold" size={18} color="#4caf50" />
            <Text variant="titleSmall" style={{ color: '#4caf50', fontWeight: '700', marginLeft: 4 }}>
              +{stats.totalIn.toFixed(0)}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
              In
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="arrow-up-bold" size={18} color="#2196f3" />
            <Text variant="titleSmall" style={{ color: '#2196f3', fontWeight: '700', marginLeft: 4 }}>
              -{stats.totalOut.toFixed(0)}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
              Out
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="delete-outline" size={18} color="#ff9800" />
            <Text variant="titleSmall" style={{ color: '#ff9800', fontWeight: '700', marginLeft: 4 }}>
              {stats.waste.toFixed(0)}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
              Waste
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="format-list-numbered" size={18} color={theme.colors.primary} />
            <Text variant="titleSmall" style={{ fontWeight: '700', marginLeft: 4 }}>
              {stats.count}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
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
  filterScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  filterChip: {
    marginRight: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#e0e0e0',
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
  sectionCount: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  card: {
    marginBottom: 8,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  movementIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
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
