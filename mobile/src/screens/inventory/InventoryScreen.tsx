import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Card, Chip, Surface, FAB, IconButton, useTheme, Badge, Searchbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenLayout from '../../components/ScreenLayout';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  current_stock: number;
  unit: string;
  reorder_point: number;
  supplier: string;
  cost_per_unit: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  last_updated: string;
}

export default function InventoryScreen() {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['all', 'produce', 'meat', 'dairy', 'dry_goods', 'beverages'];
  
  const inventoryItems: InventoryItem[] = [
    {
      id: '1',
      name: 'Tomatoes',
      category: 'produce',
      current_stock: 15,
      unit: 'lbs',
      reorder_point: 25,
      supplier: 'Fresh Farm Co.',
      cost_per_unit: 2.50,
      status: 'low_stock',
      last_updated: '2 hours ago',
    },
    {
      id: '2',
      name: 'Ground Beef',
      category: 'meat',
      current_stock: 50,
      unit: 'lbs',
      reorder_point: 20,
      supplier: 'Premium Meats',
      cost_per_unit: 8.99,
      status: 'in_stock',
      last_updated: '4 hours ago',
    },
    {
      id: '3',
      name: 'Lettuce',
      category: 'produce',
      current_stock: 0,
      unit: 'heads',
      reorder_point: 12,
      supplier: 'Fresh Farm Co.',
      cost_per_unit: 1.25,
      status: 'out_of_stock',
      last_updated: '1 hour ago',
    },
    {
      id: '4',
      name: 'Cheddar Cheese',
      category: 'dairy',
      current_stock: 8,
      unit: 'lbs',
      reorder_point: 5,
      supplier: 'Dairy Best',
      cost_per_unit: 6.75,
      status: 'in_stock',
      last_updated: '6 hours ago',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock': return Colors.success;
      case 'low_stock': return Colors.warning;
      case 'out_of_stock': return Colors.error;
      default: return Colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_stock': return 'check-circle';
      case 'low_stock': return 'alert-circle';
      case 'out_of_stock': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'in_stock': return 'In Stock';
      case 'low_stock': return 'Low Stock';
      case 'out_of_stock': return 'Out of Stock';
      default: return 'Unknown';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'produce': return 'carrot';
      case 'meat': return 'food-steak';
      case 'dairy': return 'cow';
      case 'dry_goods': return 'sack';
      case 'beverages': return 'cup';
      default: return 'package-variant';
    }
  };

  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockCount = inventoryItems.filter(item => item.status === 'low_stock').length;
  const outOfStockCount = inventoryItems.filter(item => item.status === 'out_of_stock').length;

  const renderInventoryItem = ({ item }: { item: InventoryItem }) => (
    <TouchableOpacity>
      <Card style={[styles.itemCard, Shadows.small]}>
        <Card.Content style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <View style={styles.itemLeft}>
              <MaterialCommunityIcons
                name={getCategoryIcon(item.category)}
                size={32}
                color={Colors.primary}
                style={styles.itemIcon}
              />
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: theme.colors.onSurface }]}>
                  {item.name}
                </Text>
                <Text style={[styles.itemSupplier, { color: theme.colors.onSurfaceVariant }]}>
                  {item.supplier}
                </Text>
              </View>
            </View>
            <Chip
              icon={getStatusIcon(item.status)}
              style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) + '20' }]}
              textStyle={{ color: getStatusColor(item.status), fontSize: 12 }}
            >
              {getStatusText(item.status)}
            </Chip>
          </View>
          
          <View style={styles.itemDetails}>
            <View style={styles.stockInfo}>
              <Text style={[styles.stockValue, { color: theme.colors.onSurface }]}>
                {item.current_stock} {item.unit}
              </Text>
              <Text style={[styles.stockLabel, { color: theme.colors.onSurfaceVariant }]}>
                Current Stock
              </Text>
            </View>
            <View style={styles.stockInfo}>
              <Text style={[styles.stockValue, { color: theme.colors.onSurface }]}>
                {item.reorder_point} {item.unit}
              </Text>
              <Text style={[styles.stockLabel, { color: theme.colors.onSurfaceVariant }]}>
                Reorder Point
              </Text>
            </View>
            <View style={styles.stockInfo}>
              <Text style={[styles.stockValue, { color: theme.colors.onSurface }]}>
                ${item.cost_per_unit.toFixed(2)}
              </Text>
              <Text style={[styles.stockLabel, { color: theme.colors.onSurfaceVariant }]}>
                Cost per {item.unit.slice(0, -1)}
              </Text>
            </View>
          </View>
          
          <Text style={[styles.lastUpdated, { color: theme.colors.onSurfaceVariant }]}>
            Updated {item.last_updated}
          </Text>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <ScreenLayout
      title="Inventory Management"
      subtitle="Track and manage your stock levels"
      icon="package-variant"
      iconColor={Colors.inventory}
      rightAction={
        <View style={styles.headerActions}>
          {(lowStockCount > 0 || outOfStockCount > 0) && (
            <IconButton
              icon="alert"
              size={24}
              iconColor={Colors.warning}
              onPress={() => {}}
            />
          )}
          <IconButton
            icon="refresh"
            size={24}
            onPress={() => {}}
          />
        </View>
      }
      scrollable={false}
    >
      {/* Alerts */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <Surface style={[styles.alertBanner, Shadows.small]}>
          <MaterialCommunityIcons name="alert-circle" size={24} color={Colors.warning} />
          <Text style={[styles.alertText, { color: theme.colors.onSurface }]}>
            {outOfStockCount > 0 && `${outOfStockCount} items out of stock`}
            {outOfStockCount > 0 && lowStockCount > 0 && ', '}
            {lowStockCount > 0 && `${lowStockCount} items low in stock`}
          </Text>
        </Surface>
      )}

      {/* Search */}
      <Searchbar
        placeholder="Search inventory items..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      {/* Category Filter */}
      <View style={styles.categoryContainer}>
        {categories.map((category) => (
          <Chip
            key={category}
            selected={selectedCategory === category}
            onPress={() => setSelectedCategory(category)}
            style={[
              styles.categoryChip,
              selectedCategory === category && styles.selectedChip
            ]}
          >
            {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Chip>
        ))}
      </View>

      {/* Inventory List */}
      <FlatList
        data={filteredItems}
        renderItem={renderInventoryItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => {}}
        label="Add Item"
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.warning + '10',
  },
  alertText: {
    ...Typography.body2,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  searchBar: {
    marginBottom: Spacing.md,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  categoryChip: {
    minWidth: 80,
  },
  selectedChip: {
    backgroundColor: Colors.primary + '20',
  },
  listContent: {
    paddingBottom: 100,
  },
  itemCard: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  itemContent: {
    padding: Spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemIcon: {
    marginRight: Spacing.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    ...Typography.body1,
    fontWeight: '500',
  },
  itemSupplier: {
    ...Typography.body2,
    marginTop: Spacing.xs,
  },
  statusChip: {
    marginLeft: Spacing.sm,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  stockInfo: {
    alignItems: 'center',
    flex: 1,
  },
  stockValue: {
    ...Typography.body1,
    fontWeight: '600',
  },
  stockLabel: {
    ...Typography.caption,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  lastUpdated: {
    ...Typography.caption,
    textAlign: 'right',
    fontStyle: 'italic',
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.inventory,
  },
});