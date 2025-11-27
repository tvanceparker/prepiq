// src/pages/menu/components/MenuItemCard.tsx
import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Card, Text, Chip, IconButton, useTheme, Divider } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { MenuItem, MenuItemRecipe, MenuItemIngredient } from '../../../interfaces/menu';

interface MenuItemCardProps {
  item: MenuItem;
  expanded: boolean;
  onToggle: () => void;
  onEdit: (item: MenuItem) => void;
  onDelete: (item: MenuItem) => void;
}

export default function MenuItemCard({
  item,
  expanded,
  onToggle,
  onEdit,
  onDelete,
}: MenuItemCardProps) {
  const theme = useTheme();

  // Animation for collapse
  const rotateValue = useSharedValue(0);

  React.useEffect(() => {
    rotateValue.value = withTiming(expanded ? 90 : 0, { duration: 200 });
  }, [expanded]);

  const animatedChevron = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateValue.value}deg` }],
  }));

  // Get recipes array from item (backend returns recipes array)
  const recipes = item.recipes || [];
  const hasRecipes = recipes.length > 0;

  // Get the display name (backend returns menu_item_name)
  const displayName = item.menu_item_name || item.name || 'Unnamed Item';

  return (
    <Card
      style={[styles.card, !item.is_active && { backgroundColor: theme.colors.surfaceDisabled }]}
      mode="outlined"
    >
      {/* Header - Always visible */}
      <Card.Content style={styles.header}>
        <View style={styles.mainInfo}>
          <View style={styles.nameRow}>
            <Text
              variant="titleMedium"
              style={[styles.name, { color: theme.colors.primary }]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            {!item.is_active && (
              <Chip compact style={styles.inactiveChip} textStyle={{ fontSize: 10, color: '#fff' }}>
                Inactive
              </Chip>
            )}
          </View>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Price: ${item.price.toFixed(2)}
            {item.category ? ` | Category: ${item.category}` : ''}
          </Text>
        </View>
        <IconButton
          icon={() => (
            <MaterialCommunityIcons name="pencil" size={20} color={theme.colors.onSurface} />
          )}
          size={20}
          onPress={() => onEdit(item)}
        />
      </Card.Content>

      {/* Expandable Section Toggle */}
      <Pressable onPress={onToggle} style={styles.toggleSection}>
        <View style={styles.toggleRow}>
          <Text
            variant="labelMedium"
            style={{ color: theme.colors.onSurfaceVariant, fontWeight: '600' }}
          >
            Recipes Used: {hasRecipes ? `(${recipes.length})` : ''}
          </Text>
          <Animated.View style={animatedChevron}>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={theme.colors.onSurfaceVariant}
            />
          </Animated.View>
        </View>
      </Pressable>

      {/* Expandable Content */}
      {expanded && (
        <View style={styles.expandedContent}>
          <Divider style={{ marginBottom: 8 }} />
          {hasRecipes ? (
            <View style={styles.recipesSection}>
              {recipes.map((recipe: MenuItemRecipe, index: number) => (
                <View key={recipe.recipe_id} style={styles.recipeItem}>
                  <View style={styles.recipeHeader}>
                    <MaterialCommunityIcons
                      name="chef-hat"
                      size={18}
                      color={theme.colors.secondary}
                    />
                    <Text
                      variant="bodyMedium"
                      style={[styles.recipeName, { color: theme.colors.secondary }]}
                    >
                      {recipe.recipe_name}
                    </Text>
                  </View>

                  {/* Ingredients */}
                  {recipe.ingredients && recipe.ingredients.length > 0 ? (
                    <View style={styles.ingredientsList}>
                      <Text
                        variant="labelSmall"
                        style={{ color: theme.colors.outline, marginBottom: 4, marginLeft: 26 }}
                      >
                        Ingredients:
                      </Text>
                      {recipe.ingredients.map((ing: MenuItemIngredient) => (
                        <View
                          key={`${recipe.recipe_id}-${ing.ingredient_id}`}
                          style={styles.ingredientRow}
                        >
                          <MaterialCommunityIcons
                            name="circle-small"
                            size={16}
                            color={theme.colors.outline}
                          />
                          <Text
                            variant="bodySmall"
                            style={{ color: theme.colors.onSurfaceVariant }}
                          >
                            {ing.ingredient_name || `Ingredient #${ing.ingredient_id}`}:{' '}
                            {ing.quantity} {ing.unit}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text
                      variant="bodySmall"
                      style={[styles.noIngredients, { color: theme.colors.outline }]}
                    >
                      No ingredients listed for this recipe.
                    </Text>
                  )}

                  {/* Divider between recipes */}
                  {index < recipes.length - 1 && (
                    <Divider style={{ marginVertical: 12, marginLeft: 26 }} />
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noRecipe}>
              <MaterialCommunityIcons name="chef-hat" size={24} color={theme.colors.outline} />
              <Text
                variant="bodySmall"
                style={[styles.noRecipeText, { color: theme.colors.outline }]}
              >
                No recipes assigned to this menu item.
              </Text>
            </View>
          )}

          {/* Card Actions */}
          <View style={styles.cardActions}>
            <Pressable style={styles.actionChip} onPress={() => onEdit(item)}>
              <MaterialCommunityIcons name="pencil" size={16} color={theme.colors.primary} />
              <Text variant="labelSmall" style={{ color: theme.colors.primary, marginLeft: 4 }}>
                Edit
              </Text>
            </Pressable>
            <Pressable
              style={[styles.actionChip, styles.deleteChip]}
              onPress={() => onDelete(item)}
            >
              <MaterialCommunityIcons name="delete" size={16} color="#f44336" />
              <Text variant="labelSmall" style={{ color: '#f44336', marginLeft: 4 }}>
                Delete
              </Text>
            </Pressable>
          </View>
        </View>
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
    paddingBottom: 4,
  },
  mainInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  name: {
    fontWeight: '700',
    flex: 1,
  },
  inactiveChip: {
    height: 22,
    backgroundColor: '#9e9e9e',
  },
  toggleSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  recipesSection: {
    marginTop: 8,
  },
  recipeItem: {
    marginBottom: 4,
  },
  recipeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  recipeName: {
    fontWeight: '600',
  },
  ingredientsList: {
    marginTop: 4,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 20,
    marginBottom: 2,
  },
  noIngredients: {
    marginLeft: 26,
    fontStyle: 'italic',
  },
  noRecipe: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  noRecipeText: {
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  deleteChip: {
    borderColor: '#f44336',
  },
});
