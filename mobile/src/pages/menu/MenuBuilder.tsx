// src/pages/menu/MenuBuilder.tsx
import React, { useState, useCallback, useContext } from 'react';
import { View, StyleSheet, SectionList, RefreshControl, Pressable } from 'react-native';
import {
  Surface,
  Text,
  Searchbar,
  Card,
  Button,
  Chip,
  ActivityIndicator,
  Portal,
  Dialog,
  TextInput,
  FAB,
  IconButton,
  Switch,
  useTheme,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMenuItems } from '../../hooks/useMenu';
import { AuthContext } from '../../contexts/AuthContext';
import { MenuItem } from '../../interfaces/menu';

interface MenuSection {
  title: string;
  data: MenuItem[];
}

export default function MenuBuilder(): React.JSX.Element {
  const theme = useTheme();
  const { tier } = useContext(AuthContext) || {};
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<MenuItem | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    is_active: true,
  });

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
          item.name.toLowerCase().includes(query) || item.description?.toLowerCase().includes(query)
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
    setFormData({ name: '', description: '', price: '', category: '', is_active: true });
    setShowCreateDialog(true);
  };

  // Open edit dialog
  const openEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      category: item.category || '',
      is_active: item.is_active !== false,
    });
  };

  // Handle create
  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.price) return;
    await createMenuItem({
      name: formData.name,
      description: formData.description || undefined,
      price: parseFloat(formData.price),
      category: formData.category || undefined,
      is_active: formData.is_active,
    });
    setShowCreateDialog(false);
  };

  // Handle update
  const handleUpdate = async () => {
    if (!editingItem || !formData.name.trim() || !formData.price) return;
    await updateMenuItem({
      id: editingItem.menu_item_id,
      data: {
        name: formData.name,
        description: formData.description || undefined,
        price: parseFloat(formData.price),
        category: formData.category || undefined,
        is_active: formData.is_active,
      },
    });
    setEditingItem(null);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteMenuItem(deleteConfirm.menu_item_id);
    setDeleteConfirm(null);
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
    <Card style={styles.card} mode="outlined">
      <Pressable onPress={() => openEdit(item)}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.itemInfo}>
            <View style={styles.nameRow}>
              <Text variant="titleSmall" style={styles.itemName} numberOfLines={1}>
                {item.name}
              </Text>
              {!item.is_active && (
                <Chip
                  compact
                  style={styles.inactiveChip}
                  textStyle={{ fontSize: 10, color: '#fff' }}
                >
                  Inactive
                </Chip>
              )}
            </View>
            {item.description && (
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
                numberOfLines={2}
              >
                {item.description}
              </Text>
            )}
          </View>

          <View style={styles.priceSection}>
            <Text variant="titleMedium" style={[styles.price, { color: theme.colors.primary }]}>
              ${item.price.toFixed(2)}
            </Text>
            <View style={styles.cardActions}>
              <IconButton icon="pencil" size={18} onPress={() => openEdit(item)} />
              <IconButton
                icon="delete"
                size={18}
                iconColor="#f44336"
                onPress={() => setDeleteConfirm(item)}
              />
            </View>
          </View>
        </Card.Content>
      </Pressable>
    </Card>
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
          <Chip icon="silverware">{allItems.length} items</Chip>
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
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          stickySectionHeadersEnabled
        />
      )}

      {/* FAB */}
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={openCreate}
      />

      {/* Create/Edit Dialog */}
      <Portal>
        <Dialog
          visible={showCreateDialog || !!editingItem}
          onDismiss={() => {
            setShowCreateDialog(false);
            setEditingItem(null);
          }}
        >
          <Dialog.Title>{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 400 }}>
            <View style={{ padding: 16 }}>
              <TextInput
                label="Name *"
                value={formData.name}
                onChangeText={text => setFormData(f => ({ ...f, name: text }))}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Price *"
                value={formData.price}
                onChangeText={text => setFormData(f => ({ ...f, price: text }))}
                mode="outlined"
                keyboardType="decimal-pad"
                left={<TextInput.Affix text="$" />}
                style={styles.input}
              />
              <TextInput
                label="Category"
                value={formData.category}
                onChangeText={text => setFormData(f => ({ ...f, category: text }))}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Description"
                value={formData.description}
                onChangeText={text => setFormData(f => ({ ...f, description: text }))}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.input}
              />
              <View style={styles.switchRow}>
                <Text variant="bodyMedium">Active</Text>
                <Switch
                  value={formData.is_active}
                  onValueChange={value => setFormData(f => ({ ...f, is_active: value }))}
                />
              </View>
            </View>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setShowCreateDialog(false);
                setEditingItem(null);
              }}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={editingItem ? handleUpdate : handleCreate}
              loading={creating || updating}
              disabled={!formData.name.trim() || !formData.price}
            >
              {editingItem ? 'Save' : 'Create'}
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog visible={!!deleteConfirm} onDismiss={() => setDeleteConfirm(null)}>
          <Dialog.Title>Delete Menu Item</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to delete "{deleteConfirm?.name}"?</Text>
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
  card: {
    marginBottom: 8,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemName: {
    fontWeight: '600',
  },
  inactiveChip: {
    height: 20,
    backgroundColor: '#9e9e9e',
  },
  priceSection: {
    alignItems: 'flex-end',
  },
  price: {
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
});
