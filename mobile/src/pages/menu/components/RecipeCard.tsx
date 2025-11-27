// src/pages/menu/components/RecipeCard.tsx
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, IconButton, useTheme, List, Divider } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Recipe } from '../../../interfaces/menu';

interface RecipeCardProps {
  recipe: Recipe;
  onEdit: (recipe: Recipe) => void;
}

export default function RecipeCard({ recipe, onEdit }: RecipeCardProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  const ingredientCount = recipe.ingredients?.length || 0;
  const hasDescription = !!recipe.description;
  // Backend returns 'name', interface may have 'recipe_name' as alias
  const recipeName = recipe.name || recipe.recipe_name || 'Unnamed Recipe';

  return (
    <Card style={styles.card} mode="outlined">
      {/* Header Section */}
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons name="food-variant" size={24} color={theme.colors.primary} />
            <View style={styles.titleContainer}>
              <Text variant="titleMedium" style={styles.recipeName}>
                {recipeName}
              </Text>
              {hasDescription && (
                <Text variant="bodySmall" style={styles.description} numberOfLines={1}>
                  {recipe.description}
                </Text>
              )}
            </View>
          </View>
          <IconButton
            icon={() => (
              <MaterialCommunityIcons name="pencil" size={20} color={theme.colors.primary} />
            )}
            size={20}
            onPress={() => onEdit(recipe)}
            style={styles.editButton}
          />
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.ingredientChip}>
            <MaterialCommunityIcons name="food-variant" size={16} color={theme.colors.primary} />
            <Text variant="bodySmall" style={{ color: theme.colors.primary, marginLeft: 4 }}>
              {ingredientCount} {ingredientCount === 1 ? 'ingredient' : 'ingredients'}
            </Text>
          </View>
        </View>
      </Card.Content>

      {/* Expandable Ingredients Section */}
      {ingredientCount > 0 && (
        <>
          <Divider style={styles.divider} />
          <List.Accordion
            title="Ingredients"
            titleStyle={styles.accordionTitle}
            expanded={expanded}
            onPress={() => setExpanded(!expanded)}
            left={() => (
              <MaterialCommunityIcons
                name="clipboard-list"
                size={20}
                color={theme.colors.primary}
                style={{ marginLeft: 8 }}
              />
            )}
            style={styles.accordion}
          >
            {recipe.ingredients?.map((ing, index) => {
              // Backend returns 'name', also support ingredient_name as alias
              const ingredientName = ing.name || ing.ingredient_name || 'Unknown Ingredient';
              const qty = ing.quantity ?? ing.quantity_used ?? 0;
              return (
                <List.Item
                  key={index}
                  title={ingredientName}
                  description={`${qty} ${ing.unit || 'each'}`}
                  left={() => (
                    <MaterialCommunityIcons
                      name="circle-small"
                      size={24}
                      color={theme.colors.outline}
                      style={{ marginLeft: 16 }}
                    />
                  )}
                  titleStyle={styles.ingredientTitle}
                  descriptionStyle={styles.ingredientDescription}
                  style={styles.ingredientItem}
                />
              );
            })}
          </List.Accordion>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  titleContainer: {
    flex: 1,
  },
  recipeName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    color: '#666',
    fontStyle: 'italic',
  },
  editButton: {
    margin: 0,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  ingredientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  divider: {
    marginTop: 8,
  },
  accordion: {
    backgroundColor: 'transparent',
    paddingLeft: 8,
  },
  accordionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  ingredientItem: {
    paddingLeft: 32,
    paddingVertical: 4,
  },
  ingredientTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  ingredientDescription: {
    fontSize: 13,
    color: '#888',
  },
});
