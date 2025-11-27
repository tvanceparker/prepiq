// src/pages/prep/components/BatchRecipeDetail.tsx
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Portal, Dialog, Button, Text, List, Divider, Chip, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { BatchRecipe } from '../../../interfaces/prep';

interface Props {
  visible: boolean;
  recipe: BatchRecipe | null;
  onDismiss: () => void;
  onEdit: (recipe: BatchRecipe) => void;
  onDelete: (id: number) => void;
  deleting?: boolean;
}

export default function BatchRecipeDetail({
  visible,
  recipe,
  onDismiss,
  onEdit,
  onDelete,
  deleting,
}: Props) {
  const theme = useTheme();

  if (!recipe) return null;

  const handleEdit = () => {
    onEdit(recipe);
    onDismiss();
  };

  const handleDelete = () => {
    if (recipe.batch_recipe_id) {
      onDelete(recipe.batch_recipe_id);
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>{recipe.name}</Dialog.Title>
        <Dialog.ScrollArea style={styles.scrollArea}>
          <ScrollView contentContainerStyle={styles.content}>
            {/* Description */}
            {recipe.description && (
              <View style={styles.section}>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  Description
                </Text>
                <Text variant="bodyMedium" style={{ marginTop: 4 }}>
                  {recipe.description}
                </Text>
              </View>
            )}

            {/* Quick Stats */}
            <View style={styles.statsRow}>
              <Chip icon="scale" style={styles.statChip}>
                {recipe.yield_quantity} {recipe.yield_unit}
              </Chip>
              {recipe.estimated_prep_time_minutes && (
                <Chip icon="clock-outline" style={styles.statChip}>
                  {recipe.estimated_prep_time_minutes} min
                </Chip>
              )}
              {recipe.shelf_life_days && (
                <Chip icon="calendar" style={styles.statChip}>
                  {recipe.shelf_life_days} day shelf
                </Chip>
              )}
            </View>

            <Divider style={styles.divider} />

            {/* Ingredients */}
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Ingredients ({recipe.ingredients?.length || 0})
            </Text>
            {recipe.ingredients && recipe.ingredients.length > 0 ? (
              recipe.ingredients.map((ing, index) => (
                <List.Item
                  key={index}
                  title={ing.ingredient_name || `Ingredient #${ing.ingredient_id}`}
                  description={`${ing.quantity_used} ${ing.unit}`}
                  left={props => (
                    <MaterialCommunityIcons
                      name="food-variant"
                      size={24}
                      color={theme.colors.primary}
                      style={{ marginLeft: 8, alignSelf: 'center' }}
                    />
                  )}
                  style={styles.ingredientItem}
                />
              ))
            ) : (
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }}
              >
                No ingredients specified
              </Text>
            )}

            {/* Used In Recipes */}
            {recipe.used_in_recipes && recipe.used_in_recipes.length > 0 && (
              <>
                <Divider style={styles.divider} />
                <Text variant="titleSmall" style={styles.sectionTitle}>
                  Used In Recipes ({recipe.used_in_recipes.length})
                </Text>
                {recipe.used_in_recipes.map((r, index) => (
                  <List.Item
                    key={index}
                    title={r.recipe_name}
                    description={r.recipe_description}
                    left={props => (
                      <MaterialCommunityIcons
                        name="chef-hat"
                        size={24}
                        color={theme.colors.secondary}
                        style={{ marginLeft: 8, alignSelf: 'center' }}
                      />
                    )}
                    style={styles.ingredientItem}
                  />
                ))}
              </>
            )}
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button textColor={theme.colors.error} onPress={handleDelete} loading={deleting}>
            Delete
          </Button>
          <Button onPress={onDismiss}>Close</Button>
          <Button mode="contained" onPress={handleEdit}>
            Edit
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    maxHeight: '90%',
  },
  scrollArea: {
    maxHeight: 450,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 12,
  },
  statChip: {
    marginBottom: 4,
  },
  divider: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  ingredientItem: {
    paddingLeft: 0,
  },
});
