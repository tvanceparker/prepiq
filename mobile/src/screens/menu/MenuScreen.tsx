import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { Text, Card, Chip, Surface, FAB, IconButton, useTheme, Avatar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenLayout from '../../components/ScreenLayout';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  description: string;
  ingredients: string[];
  prep_time: number;
  is_available: boolean;
  popularity_score: number;
  profit_margin: number;
}

export default function MenuScreen() {
  const theme = useTheme();
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['all', 'appetizers', 'mains', 'desserts', 'beverages'];
  
  const menuItems: MenuItem[] = [
    {
      id: '1',
      name: 'Signature Burger',
      category: 'mains',
      price: 16.99,
      cost: 6.50,
      description: 'Premium beef patty with our special sauce',
      ingredients: ['Ground Beef', 'Cheese', 'Lettuce', 'Tomato', 'Special Sauce'],
      prep_time: 12,
      is_available: true,
      popularity_score: 92,
      profit_margin: 61.7,
    },
    {
      id: '2',
      name: 'Caesar Salad',
      category: 'appetizers',
      price: 12.99,
      cost: 4.25,
      description: 'Fresh romaine lettuce with Caesar dressing',
      ingredients: ['Romaine Lettuce', 'Parmesan', 'Croutons', 'Caesar Dressing'],
      prep_time: 5,
      is_available: true,
      popularity_score: 78,
      profit_margin: 67.3,
    },
    {
      id: '3',
      name: 'Fish Tacos',
      category: 'mains',
      price: 14.99,
      cost: 5.80,
      description: 'Grilled fish with fresh salsa',
      ingredients: ['Fish Fillet', 'Tortillas', 'Salsa', 'Cabbage', 'Lime'],
      prep_time: 8,
      is_available: false,
      popularity_score: 85,
      profit_margin: 61.3,
    },
    {
      id: '4',
      name: 'Chocolate Cake',
      category: 'desserts',
      price: 8.99,
      cost: 2.75,
      description: 'Rich chocolate cake with ganache',
      ingredients: ['Chocolate', 'Flour', 'Eggs', 'Butter', 'Sugar'],
      prep_time: 45,
      is_available: true,
      popularity_score: 94,
      profit_margin: 69.4,
    },
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'appetizers': return 'food-fork-drink';
      case 'mains': return 'silverware-fork-knife';
      case 'desserts': return 'cupcake';
      case 'beverages': return 'cup';
      default: return 'food';
    }
  };

  const getPopularityColor = (score: number) => {
    if (score >= 90) return Colors.success;
    if (score >= 70) return Colors.warning;
    return Colors.error;
  };

  const filteredItems = menuItems.filter(item => {
    return selectedCategory === 'all' || item.category === selectedCategory;
  });

  const renderMenuItem = ({ item }: { item: MenuItem }) => (
    <TouchableOpacity>
      <Card style={[styles.itemCard, Shadows.medium]}>
        <Card.Content style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <View style={styles.itemLeft}>
              <Avatar.Icon
                size={50}
                icon={getCategoryIcon(item.category)}
                style={[styles.itemIcon, { backgroundColor: Colors.primary + '20' }]}
              />
              <View style={styles.itemInfo}>
                <View style={styles.itemTitleRow}>
                  <Text style={[styles.itemName, { color: theme.colors.onSurface }]}>
                    {item.name}
                  </Text>
                  {!item.is_available && (
                    <Chip
                      icon="close-circle"
                      style={[styles.statusChip, { backgroundColor: Colors.error + '20' }]}
                      textStyle={{ color: Colors.error, fontSize: 10 }}
                    >
                      Unavailable
                    </Chip>
                  )}
                </View>
                <Text style={[styles.itemDescription, { color: theme.colors.onSurfaceVariant }]}>
                  {item.description}
                </Text>
              </View>
            </View>
            <View style={styles.priceContainer}>
              <Text style={[styles.price, { color: theme.colors.onSurface }]}>
                ${item.price.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Metrics */}
          <View style={styles.metricsContainer}>
            <Surface style={[styles.metricCard, { backgroundColor: theme.colors.surfaceVariant }]}>
              <MaterialCommunityIcons name="chart-line" size={16} color={getPopularityColor(item.popularity_score)} />
              <Text style={[styles.metricValue, { color: theme.colors.onSurfaceVariant }]}>
                {item.popularity_score}%
              </Text>
              <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>
                Popularity
              </Text>
            </Surface>
            
            <Surface style={[styles.metricCard, { backgroundColor: theme.colors.surfaceVariant }]}>
              <MaterialCommunityIcons name="currency-usd" size={16} color={Colors.success} />
              <Text style={[styles.metricValue, { color: theme.colors.onSurfaceVariant }]}>
                {item.profit_margin.toFixed(1)}%
              </Text>
              <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>
                Margin
              </Text>
            </Surface>
            
            <Surface style={[styles.metricCard, { backgroundColor: theme.colors.surfaceVariant }]}>
              <MaterialCommunityIcons name="clock" size={16} color={Colors.info} />
              <Text style={[styles.metricValue, { color: theme.colors.onSurfaceVariant }]}>
                {item.prep_time}m
              </Text>
              <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>
                Prep Time
              </Text>
            </Surface>
            
            <Surface style={[styles.metricCard, { backgroundColor: theme.colors.surfaceVariant }]}>
              <MaterialCommunityIcons name="cash" size={16} color={Colors.warning} />
              <Text style={[styles.metricValue, { color: theme.colors.onSurfaceVariant }]}>
                ${item.cost.toFixed(2)}
              </Text>
              <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>
                Cost
              </Text>
            </Surface>
          </View>

          {/* Ingredients */}
          <View style={styles.ingredientsContainer}>
            <Text style={[styles.ingredientsTitle, { color: theme.colors.onSurface }]}>
              Ingredients:
            </Text>
            <View style={styles.ingredientsList}>
              {item.ingredients.map((ingredient, index) => (
                <Chip
                  key={index}
                  style={styles.ingredientChip}
                  textStyle={{ fontSize: 12 }}
                >
                  {ingredient}
                </Chip>
              ))}
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <ScreenLayout
      title="Menu Management"
      subtitle="Manage your menu items and recipes"
      icon="silverware-fork-knife"
      iconColor={Colors.secondary}
      rightAction={
        <IconButton
          icon="refresh"
          size={24}
          onPress={() => {}}
        />
      }
      scrollable={false}
    >
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
            icon={category !== 'all' ? getCategoryIcon(category) : 'food-variant'}
          >
            {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Chip>
        ))}
      </View>

      {/* Menu Items List */}
      <FlatList
        data={filteredItems}
        renderItem={renderMenuItem}
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
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  categoryChip: {
    minWidth: 100,
  },
  selectedChip: {
    backgroundColor: Colors.primary + '20',
  },
  listContent: {
    paddingBottom: 100,
  },
  itemCard: {
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  itemContent: {
    padding: Spacing.lg,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  itemIcon: {
    marginRight: Spacing.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  itemName: {
    ...Typography.h4,
    fontWeight: '600',
    flex: 1,
  },
  statusChip: {
    marginLeft: Spacing.sm,
  },
  itemDescription: {
    ...Typography.body2,
    lineHeight: 20,
  },
  priceContainer: {
    alignItems: 'center',
    marginLeft: Spacing.md,
  },
  price: {
    ...Typography.h3,
    fontWeight: 'bold',
    color: Colors.success,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  metricCard: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    minHeight: 60,
    justifyContent: 'center',
  },
  metricValue: {
    ...Typography.body1,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  metricLabel: {
    ...Typography.caption,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  ingredientsContainer: {
    marginTop: Spacing.sm,
  },
  ingredientsTitle: {
    ...Typography.body1,
    fontWeight: '500',
    marginBottom: Spacing.sm,
  },
  ingredientsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  ingredientChip: {
    marginBottom: Spacing.xs,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.secondary,
  },
});