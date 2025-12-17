import React from 'react';
import { ScrollView, View } from 'react-native';
import { ActivityIndicator, Card, Chip, Text, TextInput, useTheme } from 'react-native-paper';
import { useDishProfitability } from './hooks/useDishProfitability';

const currency = (value: number) => `$${(value ?? 0).toFixed(2)}`;

export default function DishProfitability() {
  const theme = useTheme();
  const {
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    search,
    setSearch,
    sortKey,
    setSortKey,
    query,
    items,
    summary,
    setQuickRange,
    category,
    setCategory,
    categories,
    bestMargins,
    highestFoodCost,
  } = useDishProfitability();

  const categoryOptions = categories && categories.length ? categories : ['all'];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, backgroundColor: theme.colors.background }}>
      <Card style={{ marginBottom: 12 }}>
        <Card.Content>
          <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
            Profit & Waste Analytics
          </Text>
          <Text variant="headlineSmall" style={{ fontWeight: '700', marginTop: 4 }}>
            Dish Profitability
          </Text>
          <Text variant="bodySmall" style={{ marginTop: 6, color: theme.colors.onSurfaceVariant }}>
            Latest food cost per dish using the most recent delivered PO prices.
          </Text>
          <Text variant="bodySmall" style={{ marginTop: 6, fontWeight: '600' }}>
            {startDate} → {endDate}
          </Text>
        </Card.Content>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <Card.Content>
          <Text variant="titleSmall" style={{ marginBottom: 8, fontWeight: '700' }}>
            Filters
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            {[30, 60, 90].map(days => (
              <Chip key={days} mode="outlined" onPress={() => setQuickRange(days)}>
                Last {days}d
              </Chip>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Chip mode="outlined" onPress={() => setSortKey('margin')} selected={sortKey === 'margin'}>
              Sort by margin
            </Chip>
            <Chip mode="outlined" onPress={() => setSortKey('foodCost')} selected={sortKey === 'foodCost'}>
              Sort by food cost %
            </Chip>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {categoryOptions.slice(0, 6).map(cat => (
              <Chip
                key={cat}
                mode={category === cat ? 'flat' : 'outlined'}
                selected={category === cat}
                onPress={() => setCategory(cat)}
              >
                {cat === 'all' ? 'All categories' : cat}
              </Chip>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' }}>
            <Text variant="bodySmall" style={{ flex: 1 }}>
              Search:
            </Text>
            <TextInput
              mode="outlined"
              dense
              value={search}
              onChangeText={setSearch}
              placeholder="Dish name"
              style={{ flex: 3 }}
            />
          </View>
        </Card.Content>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <Card.Content>
          <Text variant="titleSmall" style={{ marginBottom: 4, fontWeight: '700' }}>
            Summary
          </Text>
          <Text>Avg margin: {currency(summary.avgMargin)}</Text>
          <Text>Avg food cost %: {summary.avgFoodCostPct.toFixed(1)}%</Text>
          <Text>Dishes: {items.length}</Text>
        </Card.Content>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <Card.Content>
          <Text variant="titleSmall" style={{ marginBottom: 8, fontWeight: '700' }}>
            Highlights
          </Text>
          <Text variant="labelSmall" style={{ color: theme.colors.primary, marginBottom: 4 }}>
            Best margin
          </Text>
          {bestMargins.map(item => (
            <View key={item.menu_item_id} style={{ marginBottom: 6 }}>
              <Text variant="bodyMedium" style={{ fontWeight: '700' }}>
                {item.name}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Margin {currency(item.gross_margin)} • Food cost {item.food_cost_pct.toFixed(1)}%
              </Text>
            </View>
          ))}
          <Text variant="labelSmall" style={{ color: theme.colors.primary, marginTop: 8, marginBottom: 4 }}>
            High food cost
          </Text>
          {highestFoodCost.map(item => (
            <View key={item.menu_item_id} style={{ marginBottom: 6 }}>
              <Text variant="bodyMedium" style={{ fontWeight: '700' }}>
                {item.name}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Food cost {item.food_cost_pct.toFixed(1)}% • Price {currency(item.price)}
              </Text>
            </View>
          ))}
        </Card.Content>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <Card.Content>
          <Text variant="titleSmall" style={{ marginBottom: 8, fontWeight: '700' }}>
            Dishes
          </Text>
          {query.isLoading || query.isFetching ? (
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <ActivityIndicator />
              <Text variant="bodySmall" style={{ marginTop: 8 }}>
                Calculating food costs…
              </Text>
            </View>
          ) : (
            items.map(item => (
              <View
                key={item.menu_item_id}
                style={{
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.outlineVariant,
                }}
              >
                <Text variant="titleSmall" style={{ fontWeight: '700' }}>
                  {item.name}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {item.category || 'Uncategorized'}
                </Text>
                <Text variant="bodySmall" style={{ marginTop: 4 }}>
                  Margin {currency(item.gross_margin)} · Food cost {item.food_cost_pct.toFixed(1)}%
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Price {currency(item.price)} • Cost {currency(item.total_food_cost)}
                </Text>
              </View>
            ))
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}
