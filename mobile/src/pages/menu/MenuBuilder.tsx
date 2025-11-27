// src/pages/menu/MenuBuilder.tsx
import React, { useState, useCallback, useContext } from 'react';
import { View, StyleSheet, SectionList, RefreshControl } from 'react-native';
import {
  Surface,
  Text,
  Searchbar,
  Button,
  Chip,
  ActivityIndicator,
  Portal,
  Dialog,
  FAB,
  useTheme,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMenuItems, useRecipes, useCategories } from '../../hooks/useMenu';
import { AuthContext } from '../../contexts/AuthContext';
import { MenuItem } from '../../interfaces/menu';
import MenuItemCard from './components/MenuItemCard';
import MenuHintBox from './components/MenuHintBox';
import MenuItemDialog from './components/MenuItemDialog';

interface MenuSection {
  title: string;
  data: MenuItem[];
}

export default function MenuBuilder({ navigation }: { navigation?: any }): React.JSX.Element {
  const theme = useTheme();
  const { tier } = useContext(AuthContext) || {};
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<MenuItem | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Queries & mutations
  const {
    menuItems,
    loading: isLoading,
    refresh,
    createMenuItem,
    creating,
    updateMenuItem,
    updating,
    deleteMenuItem,
    deleting,
  } = useMenuItems();

  // Get available recipes for dropdown
  const { recipes: availableRecipes, loading: recipesLoading } = useRecipes();

  // Get available categories
  const { categories: availableCategories, loading: categoriesLoading } = useCategories();

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refresh();
    setRefreshing(false);
  }, [refresh]);

  // Get categories
  const categories = React.useMemo(() => {
    const cats = new Set<string>();
    menuItems.forEach((item: MenuItem) => {
      if (item.category) cats.add(item.category);
    });
    return ['all', ...Array.from(cats).sort()];
  }, [menuItems]);

  // Flatten and filter items
  const allItems = React.useMemo(() => {
    return menuItems;
  }, [menuItems]);

  const filteredItems = React.useMemo(() => {
    let items = allItems;

    if (categoryFilter !== 'all') {
      items = items.filter((item: MenuItem) => item.category === categoryFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item: MenuItem) =>
          (item.menu_item_name || item.name || '').toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
      );
    }

    return items;
  }, [allItems, categoryFilter, searchQuery]);

  // Group by category
  const sections: MenuSection[] = React.useMemo(() => {
    const grouped: Record<string, MenuItem[]> = {};

    filteredItems.forEach((item: MenuItem) => {
      const category = item.category || 'Uncategorized';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, data]) => ({ title, data }));
  }, [filteredItems]);

  // Open create dialog
  const openCreate = () => {
    setEditingItem(null);
    setShowCreateDialog(true);
  };

  // Open edit dialog
  const openEdit = (item: MenuItem) => {
    setEditingItem(item);
    setShowCreateDialog(true);
  };

  // Handle save from dialog
  const handleSave = async (data: {
    name: string;
    description?: string;
    price: number;
    category?: string;
    is_active: boolean;
    recipes: number[];
  }) => {
    if (editingItem) {
      // Update existing item
      await updateMenuItem({
        id: editingItem.menu_item_id,
        data,
      });
    } else {
      // Create new item
      await createMenuItem(data);
    }
    setShowCreateDialog(false);
    setEditingItem(null);
  };

  // Handle dialog dismiss
  const handleDismiss = () => {
    setShowCreateDialog(false);
    setEditingItem(null);
  };

  // Handle delete from dialog
  const handleDeleteFromDialog = () => {
    if (editingItem) {
      setDeleteConfirm(editingItem);
      setShowCreateDialog(false);
    }
  };

  // Handle delete confirmation
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteMenuItem(deleteConfirm.menu_item_id);
    setDeleteConfirm(null);
  };

  // Toggle expanded card
  const handleToggle = (id: number) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  // Navigate to recipe editor
  const navigateToRecipes = () => {
    navigation?.navigate?.('menu_recipe-editor');
  };

  const renderSectionHeader = ({ section }: { section: MenuSection }) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.colors.background }]}>
      <MaterialCommunityIcons name="folder" size={18} color={theme.colors.primary} />
      <Text variant="titleSmall" style={styles.sectionTitle}>
        {section.title}
      </Text>
      <Chip compact style={styles.countChip}>
        {section.data.length}
      </Chip>
    </View>
  );

  const renderItem = ({ item }: { item: MenuItem }) => (
    <MenuItemCard
      item={item}
      expanded={expandedId === item.menu_item_id}
      onToggle={() => handleToggle(item.menu_item_id)}
      onEdit={openEdit}
      onDelete={item => setDeleteConfirm(item)}
    />
  );

  if (isLoading && allItems.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16 }}>Loading menu...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <Surface style={styles.headerSurface} elevation={1}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons name="food" size={28} color={theme.colors.primary} />
            <Text variant="titleLarge" style={{ marginLeft: 8, fontWeight: '600' }}>
              Menu Builder
            </Text>
          </View>
          <View style={styles.headerChip}>
            <MaterialCommunityIcons
              name="silverware"
              size={16}
              color={theme.colors.onSurfaceVariant}
              style={{ marginRight: 4 }}
            />
            <Text variant="labelMedium">{allItems.length} items</Text>
          </View>
        </View>

        <Searchbar
          placeholder="Search menu items..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchbar}
        />

        {/* Category Filters */}
        <View style={styles.filterRow}>
          {categories.slice(0, 5).map(category => (
            <Chip
              key={category}
              selected={categoryFilter === category}
              onPress={() => setCategoryFilter(category)}
              style={styles.filterChip}
              showSelectedCheck={false}
              mode={categoryFilter === category ? 'flat' : 'outlined'}
            >
              {category === 'all' ? 'All' : category}
            </Chip>
          ))}
        </View>
      </Surface>

      {/* Menu List */}
      {sections.length === 0 ? (
        <View style={styles.emptyState}>
          <MenuHintBox onNavigateToRecipes={navigateToRecipes} />
          <MaterialCommunityIcons name="food-off" size={64} color={theme.colors.onSurfaceVariant} />
          <Text
            variant="titleMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}
          >
            No menu items found
          </Text>
          <Button mode="contained" onPress={openCreate} style={{ marginTop: 16 }}>
            Add Menu Item
          </Button>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.menu_item_id.toString()}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          ListHeaderComponent={<MenuHintBox onNavigateToRecipes={navigateToRecipes} />}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          stickySectionHeadersEnabled
        />
      )}

      {/* FAB */}
      <FAB
        icon={() => <MaterialCommunityIcons name="plus" size={24} color={theme.colors.onPrimary} />}
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={openCreate}
      />

      {/* Create/Edit Dialog */}
      <MenuItemDialog
        visible={showCreateDialog}
        editingItem={editingItem}
        availableRecipes={availableRecipes || []}
        availableCategories={availableCategories || []}
        recipesLoading={recipesLoading}
        categoriesLoading={categoriesLoading}
        saving={creating || updating}
        onSave={handleSave}
        onDismiss={handleDismiss}
        onDelete={editingItem ? handleDeleteFromDialog : undefined}
      />

      {/* Delete Confirmation */}
      <Portal>
        <Dialog visible={!!deleteConfirm} onDismiss={() => setDeleteConfirm(null)}>
          <Dialog.Title>Delete Menu Item</Dialog.Title>
          <Dialog.Content>
            <Text>
              Are you sure you want to delete "
              {deleteConfirm?.menu_item_name || deleteConfirm?.name}"?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button
              mode="contained"
              buttonColor="#f44336"
              onPress={handleDelete}
              loading={deleting}
            >
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSurface: {
    padding: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchbar: {
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    marginBottom: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    flex: 1,
    marginLeft: 8,
    fontWeight: '600',
  },
  countChip: {
    height: 22,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  headerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
});
