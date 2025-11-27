// src/pages/menu/components/MenuItemDialog.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import {
  Portal,
  Modal,
  Text,
  TextInput,
  Button,
  Switch,
  Divider,
  Chip,
  useTheme,
  ActivityIndicator,
  IconButton,
  Surface,
  Menu,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { MenuItem } from '../../../interfaces/menu';

const { height: screenHeight } = Dimensions.get('window');

interface Recipe {
  recipe_id: number;
  name?: string;
  recipe_name?: string;
  description?: string;
  yield_quantity?: number;
  yield_unit?: string;
}

interface MenuItemDialogProps {
  visible: boolean;
  editingItem: MenuItem | null;
  availableRecipes: Recipe[];
  availableCategories: string[];
  recipesLoading: boolean;
  categoriesLoading: boolean;
  saving: boolean;
  onDismiss: () => void;
  onSave: (data: {
    name: string;
    description?: string;
    price: number;
    category?: string;
    is_active: boolean;
    recipes: number[];
  }) => void;
  onDelete?: () => void;
}

export default function MenuItemDialog({
  visible,
  editingItem,
  availableRecipes,
  availableCategories,
  recipesLoading,
  categoriesLoading,
  saving,
  onDismiss,
  onSave,
  onDelete,
}: MenuItemDialogProps) {
  const theme = useTheme();

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedRecipes, setSelectedRecipes] = useState<number[]>([]);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);

  // Filter categories based on input (for autocomplete feel)
  const filteredCategories = availableCategories.filter(cat =>
    cat.toLowerCase().includes(category.toLowerCase())
  );

  // Check if user is typing a new category
  const isNewCategory =
    category.trim() &&
    !availableCategories.some(cat => cat.toLowerCase() === category.toLowerCase());

  // Reset form when dialog opens/closes or editingItem changes
  useEffect(() => {
    if (visible) {
      if (editingItem) {
        setName(editingItem.menu_item_name || editingItem.name || '');
        setPrice(editingItem.price?.toString() || '');
        setCategory(editingItem.category || '');
        setDescription(editingItem.description || '');
        setIsActive(editingItem.is_active !== false);
        // Extract existing recipe IDs
        const existingRecipeIds = (editingItem.recipes || []).map(r => r.recipe_id);
        setSelectedRecipes(existingRecipeIds);
      } else {
        // Reset for new item
        setName('');
        setPrice('');
        setCategory('');
        setDescription('');
        setIsActive(true);
        setSelectedRecipes([]);
      }
    }
  }, [visible, editingItem]);

  const toggleRecipe = (recipeId: number) => {
    setSelectedRecipes(prev =>
      prev.includes(recipeId) ? prev.filter(id => id !== recipeId) : [...prev, recipeId]
    );
  };

  const handleSave = () => {
    if (!name.trim() || !price) return;
    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      price: parseFloat(price),
      category: category.trim() || undefined,
      is_active: isActive,
      recipes: selectedRecipes,
    });
  };

  const isValid = name.trim() && price;
  const isEditing = !!editingItem;

  // Get recipe display name
  const getRecipeName = (recipe: Recipe) => recipe.name || recipe.recipe_name || 'Unnamed Recipe';

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
            {isEditing ? 'Edit Menu Item' : 'Add Menu Item'}
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
            Basic Information
          </Text>

          <TextInput
            label="Name *"
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.input}
          />

          <TextInput
            label="Price *"
            value={price}
            onChangeText={setPrice}
            mode="outlined"
            keyboardType="decimal-pad"
            left={<TextInput.Affix text="$" />}
            style={styles.input}
          />

          {/* Category Input with Autocomplete */}
          <View style={styles.categoryContainer}>
            <Menu
              visible={
                showCategoryMenu && (filteredCategories.length > 0 || Boolean(isNewCategory))
              }
              onDismiss={() => setShowCategoryMenu(false)}
              anchor={
                <TextInput
                  label="Category"
                  value={category}
                  onChangeText={text => {
                    setCategory(text);
                    setShowCategoryMenu(true);
                  }}
                  onFocus={() => setShowCategoryMenu(true)}
                  mode="outlined"
                  style={styles.input}
                  right={
                    categoriesLoading ? (
                      <TextInput.Icon icon={() => <ActivityIndicator size={16} />} />
                    ) : (
                      <TextInput.Icon
                        icon={() => (
                          <MaterialCommunityIcons
                            name={showCategoryMenu ? 'chevron-up' : 'chevron-down'}
                            size={24}
                            color={theme.colors.onSurfaceVariant}
                          />
                        )}
                        onPress={() => setShowCategoryMenu(!showCategoryMenu)}
                      />
                    )
                  }
                />
              }
              contentStyle={styles.categoryMenu}
            >
              {filteredCategories.map(cat => (
                <Menu.Item
                  key={cat}
                  onPress={() => {
                    setCategory(cat);
                    setShowCategoryMenu(false);
                  }}
                  title={cat}
                  leadingIcon={() => (
                    <MaterialCommunityIcons
                      name="folder"
                      size={24}
                      color={theme.colors.onSurfaceVariant}
                    />
                  )}
                />
              ))}
              {isNewCategory && (
                <>
                  {filteredCategories.length > 0 && <Divider />}
                  <Menu.Item
                    onPress={() => {
                      setShowCategoryMenu(false);
                    }}
                    title={`Create "${category.trim()}"`}
                    leadingIcon={() => (
                      <MaterialCommunityIcons name="plus" size={24} color={theme.colors.primary} />
                    )}
                    titleStyle={{ color: theme.colors.primary }}
                  />
                </>
              )}
            </Menu>
            {isNewCategory && !showCategoryMenu && (
              <View style={styles.newCategoryHint}>
                <MaterialCommunityIcons name="plus-circle" size={14} color={theme.colors.primary} />
                <Text variant="labelSmall" style={{ color: theme.colors.primary, marginLeft: 4 }}>
                  New category
                </Text>
              </View>
            )}
          </View>

          <TextInput
            label="Description"
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            multiline
            numberOfLines={2}
            style={styles.input}
          />

          <Divider style={styles.divider} />

          {/* Recipe Selection Section */}
          <Text variant="labelLarge" style={styles.sectionLabel}>
            Linked Recipes
          </Text>

          {selectedRecipes.length > 0 && (
            <View style={styles.selectedRecipesContainer}>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}
              >
                Selected ({selectedRecipes.length}):
              </Text>
              <View style={styles.selectedChips}>
                {selectedRecipes.map(recipeId => {
                  const recipe = availableRecipes.find(r => r.recipe_id === recipeId);
                  return (
                    <Chip
                      key={recipeId}
                      onClose={() => toggleRecipe(recipeId)}
                      style={styles.selectedChip}
                      compact
                    >
                      {recipe ? getRecipeName(recipe) : `Recipe #${recipeId}`}
                    </Chip>
                  );
                })}
              </View>
            </View>
          )}

          {recipesLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" />
              <Text
                variant="bodySmall"
                style={{ marginLeft: 8, color: theme.colors.onSurfaceVariant }}
              >
                Loading recipes...
              </Text>
            </View>
          ) : availableRecipes && availableRecipes.length > 0 ? (
            <Surface style={styles.recipeListContainer} elevation={0}>
              <ScrollView
                style={styles.recipeList}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
              >
                {availableRecipes.map(recipe => {
                  const isSelected = selectedRecipes.includes(recipe.recipe_id);
                  return (
                    <Surface
                      key={recipe.recipe_id}
                      style={[
                        styles.recipeItem,
                        isSelected && { backgroundColor: `${theme.colors.primaryContainer}` },
                      ]}
                      elevation={0}
                    >
                      <View style={styles.recipeItemContent}>
                        <View style={styles.recipeInfo}>
                          <Text
                            variant="bodyMedium"
                            style={{ fontWeight: isSelected ? '600' : '400' }}
                            numberOfLines={1}
                          >
                            {getRecipeName(recipe)}
                          </Text>
                          {recipe.description && (
                            <Text
                              variant="bodySmall"
                              style={{ color: theme.colors.onSurfaceVariant }}
                              numberOfLines={1}
                            >
                              {recipe.description}
                            </Text>
                          )}
                          {recipe.yield_quantity && (
                            <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
                              Yields: {recipe.yield_quantity} {recipe.yield_unit}
                            </Text>
                          )}
                        </View>
                        <IconButton
                          icon={() => (
                            <MaterialCommunityIcons
                              name={isSelected ? 'check-circle' : 'plus-circle-outline'}
                              size={24}
                              color={isSelected ? theme.colors.primary : theme.colors.outline}
                            />
                          )}
                          size={24}
                          onPress={() => toggleRecipe(recipe.recipe_id)}
                        />
                      </View>
                    </Surface>
                  );
                })}
              </ScrollView>
            </Surface>
          ) : (
            <View style={styles.noRecipesBox}>
              <MaterialCommunityIcons name="chef-hat" size={32} color={theme.colors.outline} />
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.outline, marginTop: 8, textAlign: 'center' }}
              >
                No recipes available.{'\n'}Create one in Recipe Editor first!
              </Text>
            </View>
          )}

          <Divider style={styles.divider} />

          {/* Status Section */}
          <View style={styles.switchRow}>
            <View>
              <Text variant="bodyLarge">Active</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {isActive ? 'Item is visible on menu' : 'Item is hidden from menu'}
              </Text>
            </View>
            <Switch value={isActive} onValueChange={setIsActive} />
          </View>
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
            {isEditing ? 'Save Changes' : 'Create Item'}
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
  input: {
    marginBottom: 12,
  },
  categoryContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  categoryMenu: {
    maxHeight: 200,
  },
  newCategoryHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -8,
    marginBottom: 12,
    marginLeft: 4,
  },
  divider: {
    marginVertical: 16,
  },
  selectedRecipesContainer: {
    marginBottom: 12,
  },
  selectedChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedChip: {
    marginBottom: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  recipeListContainer: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  recipeList: {
    maxHeight: 180,
  },
  recipeItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recipeItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingVertical: 4,
  },
  recipeInfo: {
    flex: 1,
  },
  noRecipesBox: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
