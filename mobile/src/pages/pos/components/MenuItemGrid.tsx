// src/pages/pos/components/MenuItemGrid.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Card, Text, Chip, Searchbar, ActivityIndicator, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { MenuItemType } from '../../../interfaces/pos';

interface MenuItemGridProps {
  menuItems: MenuItemType[];
  onAddItem: (item: MenuItemType) => void;
  loading?: boolean;
  categoryFilter?: string;
  onCategoryChange?: (category: string) => void;
}

const MenuItemGrid: React.FC<MenuItemGridProps> = ({
  menuItems,
  onAddItem,
  loading = false,
  categoryFilter = 'all',
  onCategoryChange,
}) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  // Get unique categories
  const categories = React.useMemo(() => {
    const cats = new Set<string>();
    menuItems.forEach(item => {
      if (item.category) cats.add(item.category);
    });
    return ['all', ...Array.from(cats).sort()];
  }, [menuItems]);

  // Filter items
  const filteredItems = React.useMemo(() => {
    let items = menuItems;

    // Category filter
    if (categoryFilter && categoryFilter !== 'all') {
      items = items.filter(item => item.category === categoryFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        item =>
          item.name.toLowerCase().includes(query) || item.description?.toLowerCase().includes(query)
      );
    }

    return items;
  }, [menuItems, categoryFilter, searchQuery]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 8 }}>Loading menu...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search */}
      <Searchbar
        placeholder="Search menu items..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.searchbar}
      />

      {/* Category Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContent}
      >
        {categories.map(category => (
          <Chip
            key={category}
            selected={categoryFilter === category}
            onPress={() => onCategoryChange?.(category)}
            style={styles.categoryChip}
            showSelectedCheck={false}
            mode={categoryFilter === category ? 'flat' : 'outlined'}
          >
            {category === 'all' ? 'All Items' : category}
          </Chip>
        ))}
      </ScrollView>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="food-off" size={48} color={theme.colors.onSurfaceVariant} />
          <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
            No menu items found
          </Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {filteredItems.map(item => (
            <Pressable
              key={item.menu_item_id}
              onPress={() => onAddItem(item)}
              style={({ pressed }) => [styles.itemWrapper, pressed && styles.itemPressed]}
            >
              <Card style={styles.itemCard} mode="elevated">
                <Card.Content style={styles.itemContent}>
                  <Text variant="titleSmall" numberOfLines={2} style={styles.itemName}>
                    {item.name}
                  </Text>
                  {item.description && (
                    <Text
                      variant="bodySmall"
                      numberOfLines={2}
                      style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
                    >
                      {item.description}
                    </Text>
                  )}
                  <View style={styles.itemFooter}>
                    <Text
                      variant="titleMedium"
                      style={[styles.price, { color: theme.colors.primary }]}
                    >
                      ${item.price.toFixed(2)}
                    </Text>
                    {item.category && (
                      <Chip compact style={styles.categoryTag}>
                        {item.category}
                      </Chip>
                    )}
                  </View>
                </Card.Content>
              </Card>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  searchbar: {
    marginBottom: 12,
  },
  categoryScroll: {
    marginBottom: 12,
  },
  categoryContent: {
    paddingRight: 16,
    gap: 8,
  },
  categoryChip: {
    marginRight: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  itemWrapper: {
    width: '50%',
    padding: 6,
  },
  itemPressed: {
    opacity: 0.7,
  },
  itemCard: {
    height: 140,
  },
  itemContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemName: {
    fontWeight: '600',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  price: {
    fontWeight: '700',
  },
  categoryTag: {
    height: 22,
  },
});

export default MenuItemGrid;
