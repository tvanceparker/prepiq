// src/pages/menu/components/RecipeDialog.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import {
  Portal,
  Modal,
  Text,
  TextInput,
  Button,
  Divider,
  useTheme,
  IconButton,
  Surface,
  Menu,
  Chip,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Recipe, Ingredient } from '../../../interfaces/menu';

const { height: screenHeight } = Dimensions.get('window');

interface RecipeIngredientRow {
  ingredient_id: number;
  ingredient_name: string;
  quantity: string;
  unit: string;
}

interface RecipeDialogProps {
  visible: boolean;
  editingRecipe: Recipe | null;
  availableIngredients: Ingredient[];
  availableBatchRecipes: any[];
  ingredientsLoading: boolean;
  saving: boolean;
  onDismiss: () => void;
  onSave: (data: {
    name: string; // Backend expects 'name'
    description?: string;
    ingredients: { ingredient_id: number; quantity: number; unit: string }[];
  }) => void;
  onDelete?: () => void;
}

export default function RecipeDialog({
  visible,
  editingRecipe,
  availableIngredients,
  availableBatchRecipes,
  ingredientsLoading,
  saving,
  onDismiss,
  onSave,
  onDelete,
}: RecipeDialogProps) {
  const theme = useTheme();

  const [recipeName, setRecipeName] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState<RecipeIngredientRow[]>([]);
  const [menuVisible, setMenuVisible] = useState<number | null>(null);

  // Reset form when dialog opens/closes or editingRecipe changes
  useEffect(() => {
    if (visible) {
      if (editingRecipe) {
        // Backend returns 'name', interface may have 'recipe_name' as alias
        setRecipeName(editingRecipe.name || editingRecipe.recipe_name || '');
        setDescription(editingRecipe.description || '');
        setIngredients(
          (editingRecipe.ingredients || []).map(ri => {
            // Backend returns 'name' for ingredient, also check reference_id
            const ingId = ri.ingredient_id || ri.reference_id;
            const ingName =
              ri.name ||
              ri.ingredient_name ||
              availableIngredients.find(ing => ing.ingredient_id === ingId)?.name ||
              'Unknown Ingredient';
            const qty = ri.quantity ?? ri.quantity_used ?? 0;
            return {
              ingredient_id: ingId || 0,
              ingredient_name: ingName,
              quantity: qty.toString(),
              unit: ri.unit || '',
            };
          })
        );
      } else {
        setRecipeName('');
        setDescription('');
        setIngredients([]);
      }
    }
  }, [visible, editingRecipe, availableIngredients]);

  const addIngredient = () => {
    setIngredients(prev => [
      ...prev,
      {
        ingredient_id: 0,
        ingredient_name: '',
        quantity: '',
        unit: '',
      },
    ]);
  };

  const updateIngredient = (index: number, field: keyof RecipeIngredientRow, value: any) => {
    setIngredients(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const selectIngredient = (index: number, ingredient: Ingredient) => {
    setIngredients(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        ingredient_id: ingredient.ingredient_id,
        ingredient_name: ingredient.name,
        unit: ingredient.unit || '',
      };
      return updated;
    });
    setMenuVisible(null);
  };

  const removeIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!recipeName.trim()) return;

    onSave({
      name: recipeName.trim(),
      description: description.trim() || undefined,
      ingredients: ingredients
        .filter(ing => ing.ingredient_id && ing.quantity)
        .map(ing => ({
          ingredient_id: ing.ingredient_id,
          quantity: parseFloat(ing.quantity),
          unit: ing.unit || 'each',
        })),
    });
  };

  const isValid = recipeName.trim();
  const isEditing = !!editingRecipe;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text variant="titleLarge" style={styles.headerTitle}>
            {isEditing ? 'Edit Recipe' : 'Add New Recipe'}
          </Text>
          <IconButton
            icon={() => (
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurface} />
            )}
            size={24}
            onPress={onDismiss}
          />
        </View>

        <Divider />

        {/* Scrollable Content */}
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={true}
        >
          {/* Basic Info Section */}
          <Text variant="labelLarge" style={styles.sectionLabel}>
            Recipe Details
          </Text>

          <TextInput
            label="Recipe Name *"
            value={recipeName}
            onChangeText={setRecipeName}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Instructions / Description"
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            multiline
            numberOfLines={4}
            style={styles.input}
          />

          <Divider style={styles.divider} />

          {/* Ingredients Section */}
          <View style={styles.sectionHeader}>
            <Text variant="labelLarge" style={styles.sectionLabel}>
              Ingredients
            </Text>
            <Button mode="text" onPress={addIngredient} compact>
              + Add
            </Button>
          </View>

          {ingredients.length === 0 ? (
            <View style={styles.emptyBox}>
              <MaterialCommunityIcons name="food-off" size={32} color={theme.colors.outline} />
              <Text variant="bodyMedium" style={{ color: theme.colors.outline, marginTop: 8 }}>
                No ingredients added yet
              </Text>
            </View>
          ) : (
            ingredients.map((ing, index) => (
              <Surface key={index} style={styles.ingredientRow} elevation={1}>
                {/* Ingredient Selector */}
                <View style={styles.ingredientMain}>
                  <Menu
                    visible={menuVisible === index}
                    onDismiss={() => setMenuVisible(null)}
                    anchor={
                      <Button
                        mode="outlined"
                        onPress={() => setMenuVisible(index)}
                        style={styles.ingredientButton}
                        contentStyle={styles.ingredientButtonContent}
                      >
                        {ing.ingredient_name || 'Select ingredient...'}{' '}
                        {menuVisible === index ? '▲' : '▼'}
                      </Button>
                    }
                    contentStyle={styles.menu}
                  >
                    <ScrollView style={styles.menuScroll}>
                      {availableIngredients.map(ingredient => (
                        <Menu.Item
                          key={ingredient.ingredient_id}
                          onPress={() => selectIngredient(index, ingredient)}
                          title={ingredient.name}
                        />
                      ))}
                    </ScrollView>
                  </Menu>

                  {/* Quantity and Unit Row */}
                  <View style={styles.quantityRow}>
                    <TextInput
                      label="Quantity"
                      value={ing.quantity}
                      onChangeText={value => updateIngredient(index, 'quantity', value)}
                      mode="outlined"
                      keyboardType="decimal-pad"
                      style={styles.quantityInput}
                      dense
                    />
                    <TextInput
                      label="Unit"
                      value={ing.unit}
                      onChangeText={value => updateIngredient(index, 'unit', value)}
                      mode="outlined"
                      style={styles.unitInput}
                      dense
                    />
                  </View>
                </View>

                {/* Remove Button */}
                <IconButton
                  icon={() => (
                    <MaterialCommunityIcons name="delete" size={20} color={theme.colors.error} />
                  )}
                  size={20}
                  onPress={() => removeIngredient(index)}
                  style={styles.removeButton}
                />
              </Surface>
            ))
          )}
        </ScrollView>

        <Divider />

        {/* Footer Actions */}
        <View style={styles.footer}>
          {isEditing && onDelete && (
            <Button
              onPress={onDelete}
              textColor={theme.colors.error}
              style={[styles.footerButton, { marginRight: 'auto' }]}
            >
              Delete
            </Button>
          )}
          <Button onPress={onDismiss} style={styles.footerButton}>
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleSave}
            loading={saving}
            disabled={!isValid || saving}
            style={styles.footerButton}
          >
            {isEditing ? 'Save Changes' : 'Create Recipe'}
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    margin: 16,
    borderRadius: 16,
    maxHeight: screenHeight * 0.85,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 8,
    paddingVertical: 8,
  },
  headerTitle: {
    fontWeight: '600',
  },
  scrollContent: {
    maxHeight: screenHeight * 0.6,
  },
  scrollContentContainer: {
    padding: 20,
  },
  sectionLabel: {
    fontWeight: '600',
    marginBottom: 12,
    color: '#666',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  input: {
    marginBottom: 12,
  },
  divider: {
    marginVertical: 16,
  },
  emptyBox: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 12,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#fafafa',
  },
  ingredientMain: {
    flex: 1,
  },
  ingredientButton: {
    marginBottom: 8,
    justifyContent: 'flex-start',
  },
  ingredientButtonContent: {
    justifyContent: 'flex-start',
  },
  menu: {
    maxHeight: 200,
  },
  menuScroll: {
    maxHeight: 200,
  },
  quantityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quantityInput: {
    flex: 1,
  },
  unitInput: {
    flex: 1,
  },
  removeButton: {
    marginTop: -4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    gap: 12,
  },
  footerButton: {
    minWidth: 100,
  },
});
