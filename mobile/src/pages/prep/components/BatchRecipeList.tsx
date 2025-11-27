// src/pages/prep/components/BatchRecipeList.tsx
import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Card, Text, Chip, IconButton, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { BatchRecipe } from '../../../interfaces/prep';

interface Props {
  recipes: BatchRecipe[];
  selectedId: number | null;
  onSelect: (recipe: BatchRecipe) => void;
  onEdit: (recipe: BatchRecipe) => void;
}

export default function BatchRecipeList({ recipes, selectedId, onSelect, onEdit }: Props) {
  const theme = useTheme();

  const renderItem = ({ item }: { item: BatchRecipe }) => {
    const isSelected = item.batch_recipe_id === selectedId;

    return (
      <Card
        mode={isSelected ? 'elevated' : 'outlined'}
        style={[styles.card, isSelected && { borderColor: theme.colors.primary, borderWidth: 2 }]}
        onPress={() => onSelect(item)}
      >
        <Card.Content>
          <View style={styles.headerRow}>
            <View style={styles.titleContainer}>
              <Text variant="titleSmall" style={{ fontWeight: '600' }} numberOfLines={1}>
                {item.name}
              </Text>
              {item.description && (
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}
                  numberOfLines={2}
                >
                  {item.description}
                </Text>
              )}
            </View>
            <IconButton
              icon="pencil"
              size={18}
              onPress={() => onEdit(item)}
              style={styles.editButton}
            />
          </View>

          <View style={styles.chipRow}>
            <Chip icon="scale" style={styles.chip}>
              {item.yield_quantity} {item.yield_unit}
            </Chip>
            {item.estimated_prep_time_minutes && (
              <Chip icon="clock-outline" style={styles.chip}>
                {item.estimated_prep_time_minutes}m
              </Chip>
            )}
            {item.shelf_life_days && (
              <Chip icon="calendar" style={styles.chip}>
                {item.shelf_life_days}d
              </Chip>
            )}
          </View>

          {item.ingredients && item.ingredients.length > 0 && (
            <View style={styles.ingredientPreview}>
              <MaterialCommunityIcons
                name="food-variant"
                size={14}
                color={theme.colors.onSurfaceVariant}
              />
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}
                numberOfLines={1}
              >
                {item.ingredients.length} ingredient
                {item.ingredients.length !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  if (recipes.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons
          name="clipboard-text-off"
          size={48}
          color={theme.colors.onSurfaceVariant}
        />
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, textAlign: 'center' }}
        >
          No batch recipes found
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={recipes}
      keyExtractor={item => item.batch_recipe_id.toString()}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 16,
  },
  card: {
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  editButton: {
    margin: -8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
  },
  chip: {
    height: 28,
  },
  ingredientPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
});
