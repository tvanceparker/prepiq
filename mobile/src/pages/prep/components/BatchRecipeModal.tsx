// src/pages/prep/components/BatchRecipeModal.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Portal,
  Dialog,
  TextInput,
  Button,
  Text,
  IconButton,
  useTheme,
  Divider,
  Menu,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { BatchRecipe, BatchRecipeCreate, Ingredient } from '../../../interfaces/prep';

interface BatchRecipeIngredientForm {
  ingredient_id: number | null;
  ingredient_name?: string;
  quantity_used: string;
  unit: string;
}

interface BatchRecipeForm {
  name: string;
  description: string;
  yield_quantity: string;
  yield_unit: string;
  estimated_prep_time_minutes: string;
  shelf_life_days: string;
  ingredients: BatchRecipeIngredientForm[];
}

const UNITS = ['kg', 'g', 'lbs', 'oz', 'liter', 'ml', 'count', 'each', 'cup', 'tbsp', 'tsp'];

const blankForm = (): BatchRecipeForm => ({
  name: '',
  description: '',
  yield_quantity: '',
  yield_unit: '',
  estimated_prep_time_minutes: '',
  shelf_life_days: '',
  ingredients: [],
});

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onSave: (data: BatchRecipeCreate) => Promise<void>;
  ingredients: Ingredient[];
  loading?: boolean;
  editRecipe?: BatchRecipe | null;
}

export default function BatchRecipeModal({
  visible,
  onDismiss,
  onSave,
  ingredients,
  loading,
  editRecipe,
}: Props) {
  const theme = useTheme();
  const [form, setForm] = useState<BatchRecipeForm>(blankForm());
  const [ingredientMenuVisible, setIngredientMenuVisible] = useState<number | null>(null);
  const [unitMenuVisible, setUnitMenuVisible] = useState<number | null>(null);

  // Reset form when modal opens/closes or editRecipe changes
  useEffect(() => {
    if (visible) {
      if (editRecipe) {
        setForm({
          name: editRecipe.name || '',
          description: editRecipe.description || '',
          yield_quantity: editRecipe.yield_quantity?.toString() || '',
          yield_unit: editRecipe.yield_unit || '',
          estimated_prep_time_minutes: editRecipe.estimated_prep_time_minutes?.toString() || '',
          shelf_life_days: editRecipe.shelf_life_days?.toString() || '',
          ingredients:
            editRecipe.ingredients?.map(ing => ({
              ingredient_id: ing.ingredient_id,
              ingredient_name: ing.ingredient_name,
              quantity_used: ing.quantity_used?.toString() || '',
              unit: ing.unit || '',
            })) || [],
        });
      } else {
        setForm(blankForm());
      }
    }
  }, [visible, editRecipe]);

  const handleFormChange = (field: keyof BatchRecipeForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleIngredientChange = (
    index: number,
    field: keyof BatchRecipeIngredientForm,
    value: any
  ) => {
    setForm(prev => {
      const updated = [...prev.ingredients];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, ingredients: updated };
    });
  };

  const handleSelectIngredient = (index: number, ingredient: Ingredient) => {
    setForm(prev => {
      const updated = [...prev.ingredients];
      updated[index] = {
        ...updated[index],
        ingredient_id: ingredient.ingredient_id,
        ingredient_name: ingredient.name,
      };
      return { ...prev, ingredients: updated };
    });
    setIngredientMenuVisible(null);
  };

  const handleAddIngredient = () => {
    setForm(prev => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        { ingredient_id: null, ingredient_name: '', quantity_used: '', unit: '' },
      ],
    }));
  };

  const handleRemoveIngredient = (index: number) => {
    setForm(prev => {
      const updated = [...prev.ingredients];
      updated.splice(index, 1);
      return { ...prev, ingredients: updated };
    });
  };

  const handleSubmit = async () => {
    const data: BatchRecipeCreate = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      yield_quantity: parseFloat(form.yield_quantity) || 1,
      yield_unit: form.yield_unit.trim() || 'batch',
      estimated_prep_time_minutes: form.estimated_prep_time_minutes
        ? parseInt(form.estimated_prep_time_minutes, 10)
        : undefined,
      shelf_life_days: form.shelf_life_days ? parseInt(form.shelf_life_days, 10) : undefined,
      ingredients: form.ingredients
        .filter(ing => ing.ingredient_id && ing.quantity_used)
        .map(ing => ({
          ingredient_id: ing.ingredient_id!,
          quantity_used: parseFloat(ing.quantity_used) || 0,
          unit: ing.unit || '',
        })),
    };
    await onSave(data);
  };

  const isValid = form.name.trim().length > 0;

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>{editRecipe ? 'Edit Batch Recipe' : 'Create New Batch Recipe'}</Dialog.Title>
        <Dialog.ScrollArea style={styles.scrollArea}>
          <ScrollView contentContainerStyle={styles.content}>
            {/* Basic Fields */}
            <TextInput
              label="Name *"
              value={form.name}
              onChangeText={text => handleFormChange('name', text)}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Description"
              value={form.description}
              onChangeText={text => handleFormChange('description', text)}
              mode="outlined"
              multiline
              numberOfLines={2}
              style={styles.input}
            />
            <View style={styles.row}>
              <TextInput
                label="Yield Qty"
                value={form.yield_quantity}
                onChangeText={text => handleFormChange('yield_quantity', text)}
                mode="outlined"
                keyboardType="decimal-pad"
                style={[styles.input, styles.flex1]}
              />
              <TextInput
                label="Yield Unit"
                value={form.yield_unit}
                onChangeText={text => handleFormChange('yield_unit', text)}
                mode="outlined"
                placeholder="gallons, kg, batch"
                style={[styles.input, styles.flex1]}
              />
            </View>
            <View style={styles.row}>
              <TextInput
                label="Prep Time (min)"
                value={form.estimated_prep_time_minutes}
                onChangeText={text => handleFormChange('estimated_prep_time_minutes', text)}
                mode="outlined"
                keyboardType="number-pad"
                style={[styles.input, styles.flex1]}
              />
              <TextInput
                label="Shelf Life (days)"
                value={form.shelf_life_days}
                onChangeText={text => handleFormChange('shelf_life_days', text)}
                mode="outlined"
                keyboardType="number-pad"
                style={[styles.input, styles.flex1]}
              />
            </View>

            {/* Ingredients Section */}
            <Divider style={styles.divider} />
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Ingredients
            </Text>

            {form.ingredients.map((ing, index) => (
              <View key={index} style={styles.ingredientRow}>
                {/* Ingredient Picker */}
                <View style={styles.ingredientPicker}>
                  <Menu
                    visible={ingredientMenuVisible === index}
                    onDismiss={() => setIngredientMenuVisible(null)}
                    anchor={
                      <Button
                        mode="outlined"
                        onPress={() => setIngredientMenuVisible(index)}
                        style={styles.menuButton}
                        contentStyle={styles.menuButtonContent}
                      >
                        {ing.ingredient_name || 'Select Ingredient'}
                      </Button>
                    }
                    contentStyle={styles.menuContent}
                  >
                    <ScrollView style={styles.menuScroll}>
                      {ingredients.map(ingredient => (
                        <Menu.Item
                          key={ingredient.ingredient_id}
                          onPress={() => handleSelectIngredient(index, ingredient)}
                          title={ingredient.name}
                        />
                      ))}
                    </ScrollView>
                  </Menu>
                </View>

                {/* Quantity */}
                <TextInput
                  label="Qty"
                  value={ing.quantity_used}
                  onChangeText={text => handleIngredientChange(index, 'quantity_used', text)}
                  mode="outlined"
                  keyboardType="decimal-pad"
                  style={styles.qtyInput}
                  dense
                />

                {/* Unit Picker */}
                <Menu
                  visible={unitMenuVisible === index}
                  onDismiss={() => setUnitMenuVisible(null)}
                  anchor={
                    <Button
                      mode="outlined"
                      onPress={() => setUnitMenuVisible(index)}
                      style={styles.unitButton}
                      contentStyle={styles.unitButtonContent}
                    >
                      {ing.unit || 'Unit'}
                    </Button>
                  }
                >
                  {UNITS.map(unit => (
                    <Menu.Item
                      key={unit}
                      onPress={() => {
                        handleIngredientChange(index, 'unit', unit);
                        setUnitMenuVisible(null);
                      }}
                      title={unit}
                    />
                  ))}
                </Menu>

                {/* Delete Button */}
                <IconButton
                  icon="delete"
                  iconColor={theme.colors.error}
                  size={20}
                  onPress={() => handleRemoveIngredient(index)}
                />
              </View>
            ))}

            <Button
              mode="outlined"
              onPress={handleAddIngredient}
              icon={() => (
                <MaterialCommunityIcons name="plus" size={18} color={theme.colors.primary} />
              )}
              style={styles.addButton}
            >
              Add Ingredient
            </Button>
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={!isValid || loading}
          >
            {editRecipe ? 'Update' : 'Create'}
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
    maxHeight: 500,
  },
  content: {
    padding: 16,
  },
  input: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  divider: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  ingredientPicker: {
    flex: 2,
  },
  menuButton: {
    width: '100%',
  },
  menuButtonContent: {
    justifyContent: 'flex-start',
  },
  menuContent: {
    maxHeight: 300,
  },
  menuScroll: {
    maxHeight: 250,
  },
  qtyInput: {
    width: 70,
  },
  unitButton: {
    minWidth: 60,
  },
  unitButtonContent: {
    justifyContent: 'center',
  },
  addButton: {
    marginTop: 8,
  },
});
