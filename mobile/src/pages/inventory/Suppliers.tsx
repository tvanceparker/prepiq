// src/pages/inventory/Suppliers.tsx
import React, { useState, useCallback, useContext, useMemo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ScrollView } from 'react-native';
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
  useTheme,
  List,
  Divider,
  Switch,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSuppliers } from '../../hooks/useSuppliers';
import { updateIngredientSupplier } from '../../api/inventory';
import { AuthContext } from '../../contexts/AuthContext';
import type { SupplierDTO, SupplierIngredient } from '../../interfaces/inventory';

interface SnackbarState {
  visible: boolean;
  message: string;
  type: 'success' | 'error';
}

export default function Suppliers(): React.JSX.Element {
  const theme = useTheme();
  const { tier } = useContext(AuthContext) || {};
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState(true);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierDTO | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<SupplierDTO | null>(null);

  // Detail view state
  const [expandedSupplierId, setExpandedSupplierId] = useState<number | null>(null);

  // Ingredient editing state
  const [editingIngredient, setEditingIngredient] = useState<SupplierIngredient | null>(null);
  const [ingredientForm, setIngredientForm] = useState({
    unit: '',
    cost_per_unit: '',
    lead_time_days: '',
    spoilage_rate: '',
    shelf_life_days: '',
    preferred: false,
    min_order_quantity: '',
    supplier_priority: '',
    pack_size: '',
    quantity_per_pack_item: '',
  });
  const [savingIngredient, setSavingIngredient] = useState(false);

  // Snackbar state
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    visible: false,
    message: '',
    type: 'success',
  });

  // Form state for supplier
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    region: '',
    contact_info: '',
    rating: '',
    website: '',
    is_active: true,
    supplier_feedback: '',
    contract_status: 'Active',
  });

  // Queries & mutations
  const {
    suppliers,
    loading: isLoading,
    refresh,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    creating,
    updating,
    deleting,
  } = useSuppliers();

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  // Filter suppliers by active status and search
  const filteredSuppliers = useMemo(() => {
    let result = suppliers.filter(s => (s.is_active ?? true) === filterActive);
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        s =>
          s.name.toLowerCase().includes(query) ||
          s.type?.toLowerCase().includes(query) ||
          s.region?.toLowerCase().includes(query)
      );
    }
    return result;
  }, [suppliers, filterActive, searchQuery]);

  // Open create dialog
  const openCreate = () => {
    setFormData({
      name: '',
      type: '',
      region: '',
      contact_info: '',
      rating: '',
      website: '',
      is_active: true,
      supplier_feedback: '',
      contract_status: 'Active',
    });
    setShowCreateDialog(true);
  };

  // Open edit dialog
  const openEdit = (supplier: SupplierDTO) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      type: supplier.type || '',
      region: supplier.region || '',
      contact_info: supplier.contact_info || '',
      rating: supplier.rating?.toString() || '',
      website: supplier.website || '',
      is_active: supplier.is_active ?? true,
      supplier_feedback: supplier.supplier_feedback || '',
      contract_status: supplier.contract_status || 'Active',
    });
  };

  // Handle create
  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    try {
      await createSupplier({
        ...formData,
        rating: formData.rating ? parseFloat(formData.rating) : undefined,
      });
      setShowCreateDialog(false);
      setSnackbar({ visible: true, message: 'Supplier created successfully', type: 'success' });
    } catch (e: any) {
      setSnackbar({
        visible: true,
        message: e.message || 'Failed to create supplier',
        type: 'error',
      });
    }
  };

  // Handle update
  const handleUpdate = async () => {
    if (!editingSupplier || !formData.name.trim()) return;
    try {
      await updateSupplier({
        supplier_id: editingSupplier.supplier_id,
        ...formData,
        rating: formData.rating ? parseFloat(formData.rating) : undefined,
      });
      setEditingSupplier(null);
      setSnackbar({ visible: true, message: 'Supplier updated successfully', type: 'success' });
    } catch (e: any) {
      setSnackbar({
        visible: true,
        message: e.message || 'Failed to update supplier',
        type: 'error',
      });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteSupplier(deleteConfirm.supplier_id);
      setDeleteConfirm(null);
      setSnackbar({ visible: true, message: 'Supplier deleted successfully', type: 'success' });
    } catch (e: any) {
      setSnackbar({
        visible: true,
        message: e.message || 'Failed to delete supplier',
        type: 'error',
      });
    }
  };

  // Toggle expanded supplier
  const toggleExpand = (supplierId: number) => {
    setExpandedSupplierId(expandedSupplierId === supplierId ? null : supplierId);
  };

  // Open ingredient edit dialog
  const openIngredientEdit = (ing: SupplierIngredient) => {
    setEditingIngredient(ing);
    setIngredientForm({
      unit: ing.unit || '',
      cost_per_unit: ing.cost_per_unit?.toString() || '',
      lead_time_days: ing.lead_time_days?.toString() || '',
      spoilage_rate: ing.spoilage_rate?.toString() || '',
      shelf_life_days: ing.shelf_life_days?.toString() || '',
      preferred: ing.preferred || false,
      min_order_quantity: ing.min_order_quantity?.toString() || '',
      supplier_priority: ing.supplier_priority?.toString() || '',
      pack_size: ing.pack_size?.toString() || '',
      quantity_per_pack_item: ing.quantity_per_pack_item?.toString() || '',
    });
  };

  // Save ingredient supplier changes
  const handleSaveIngredient = async () => {
    if (!editingIngredient) return;
    setSavingIngredient(true);
    try {
      await updateIngredientSupplier({
        ingredient_supplier_id: editingIngredient.ingredient_supplier_id,
        unit: ingredientForm.unit || null,
        cost_per_unit: ingredientForm.cost_per_unit
          ? parseFloat(ingredientForm.cost_per_unit)
          : null,
        lead_time_days: ingredientForm.lead_time_days
          ? parseInt(ingredientForm.lead_time_days)
          : null,
        spoilage_rate: ingredientForm.spoilage_rate
          ? parseFloat(ingredientForm.spoilage_rate)
          : null,
        shelf_life_days: ingredientForm.shelf_life_days
          ? parseInt(ingredientForm.shelf_life_days)
          : null,
        preferred: ingredientForm.preferred,
        min_order_quantity: ingredientForm.min_order_quantity
          ? parseInt(ingredientForm.min_order_quantity)
          : null,
        supplier_priority: ingredientForm.supplier_priority
          ? parseInt(ingredientForm.supplier_priority)
          : null,
        pack_size: ingredientForm.pack_size ? parseInt(ingredientForm.pack_size) : null,
        quantity_per_pack_item: ingredientForm.quantity_per_pack_item
          ? parseFloat(ingredientForm.quantity_per_pack_item)
          : null,
      });
      setSnackbar({ visible: true, message: 'Ingredient updated successfully', type: 'success' });
      setEditingIngredient(null);
      refresh();
    } catch (e: any) {
      setSnackbar({
        visible: true,
        message: e.message || 'Failed to update ingredient',
        type: 'error',
      });
    } finally {
      setSavingIngredient(false);
    }
  };

  // Group ingredients by category (first letter of name as simple grouping)
  const groupIngredients = (ingredients: SupplierIngredient[]) => {
    const groups: Record<string, SupplierIngredient[]> = {};
    ingredients.forEach(ing => {
      const category = ing.ingredient_name?.charAt(0).toUpperCase() || 'Other';
      if (!groups[category]) groups[category] = [];
      groups[category].push(ing);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  };

  const renderSupplier = ({ item }: { item: SupplierDTO }) => {
    const isExpanded = expandedSupplierId === item.supplier_id;
    const ingredientGroups = groupIngredients(item.ingredients || []);
    const ingredientCount = item.ingredients?.length || 0;

    return (
      <Card style={styles.card} mode="outlined">
        {/* Header - tap to expand */}
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.supplierInfo}>
              <View style={styles.nameRow}>
                <Text variant="titleMedium" style={styles.supplierName}>
                  {item.name}
                </Text>
                {item.is_active ? (
                  <Chip
                    compact
                    mode="flat"
                    style={[styles.statusChip, { backgroundColor: '#e8f5e9' }]}
                    textStyle={{ color: '#2e7d32', fontSize: 10 }}
                  >
                    Active
                  </Chip>
                ) : (
                  <Chip
                    compact
                    mode="flat"
                    style={[styles.statusChip, { backgroundColor: '#ffebee' }]}
                    textStyle={{ color: '#c62828', fontSize: 10 }}
                  >
                    Inactive
                  </Chip>
                )}
              </View>

              {/* Info chips row */}
              <View style={styles.infoRow}>
                {item.type && (
                  <Chip
                    icon={() => (
                      <MaterialCommunityIcons name="tag" size={14} color={theme.colors.primary} />
                    )}
                    style={styles.infoChip}
                    textStyle={styles.infoChipText}
                  >
                    {item.type}
                  </Chip>
                )}
                {item.region && (
                  <Chip
                    icon={() => (
                      <MaterialCommunityIcons
                        name="map-marker"
                        size={14}
                        color={theme.colors.primary}
                      />
                    )}
                    style={styles.infoChip}
                    textStyle={styles.infoChipText}
                  >
                    {item.region}
                  </Chip>
                )}
                {item.rating != null && item.rating > 0 && (
                  <Chip
                    icon={() => <MaterialCommunityIcons name="star" size={14} color="#ffc107" />}
                    style={styles.infoChip}
                    textStyle={styles.infoChipText}
                  >
                    {item.rating.toFixed(1)}
                  </Chip>
                )}
                {ingredientCount > 0 && (
                  <Chip
                    icon={() => (
                      <MaterialCommunityIcons
                        name="package-variant"
                        size={14}
                        color={theme.colors.primary}
                      />
                    )}
                    style={styles.infoChip}
                    textStyle={styles.infoChipText}
                  >
                    {ingredientCount} items
                  </Chip>
                )}
              </View>

              {item.contact_info && (
                <View style={styles.contactRow}>
                  <MaterialCommunityIcons
                    name="card-account-phone"
                    size={14}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <Text variant="bodySmall" style={styles.contactText}>
                    {item.contact_info}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.cardActions}>
              <IconButton
                icon={() => (
                  <MaterialCommunityIcons name="pencil" size={18} color={theme.colors.primary} />
                )}
                size={18}
                onPress={() => openEdit(item)}
              />
              <IconButton
                icon={() => (
                  <MaterialCommunityIcons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={theme.colors.onSurfaceVariant}
                  />
                )}
                size={18}
                onPress={() => toggleExpand(item.supplier_id)}
              />
            </View>
          </View>
        </Card.Content>

        {/* Expanded content - ingredients */}
        {isExpanded && (
          <>
            <Divider />
            <Card.Content style={styles.expandedContent}>
              {ingredientCount === 0 ? (
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }}
                >
                  No ingredients from this supplier
                </Text>
              ) : (
                ingredientGroups.map(([letter, ingredients]) => (
                  <View key={letter} style={styles.ingredientGroup}>
                    <Text variant="labelSmall" style={styles.groupHeader}>
                      {letter}
                    </Text>
                    {ingredients.map(ing => (
                      <List.Item
                        key={`ing-${ing.ingredient_supplier_id}`}
                        title={ing.ingredient_name}
                        description={`$${ing.cost_per_unit?.toFixed(2) || '0.00'}/${
                          ing.unit || 'unit'
                        } • ${ing.lead_time_days || 0}d lead`}
                        left={() => (
                          <View style={styles.ingredientIcon}>
                            {ing.preferred ? (
                              <MaterialCommunityIcons name="star" size={16} color="#ffc107" />
                            ) : (
                              <MaterialCommunityIcons
                                name="package-variant"
                                size={16}
                                color={theme.colors.onSurfaceVariant}
                              />
                            )}
                          </View>
                        )}
                        right={() => (
                          <IconButton
                            icon={() => (
                              <MaterialCommunityIcons
                                name="pencil"
                                size={18}
                                color={theme.colors.primary}
                              />
                            )}
                            size={16}
                            onPress={() => openIngredientEdit(ing)}
                          />
                        )}
                        style={styles.ingredientItem}
                        titleStyle={styles.ingredientTitle}
                        descriptionStyle={styles.ingredientDesc}
                      />
                    ))}
                  </View>
                ))
              )}

              {/* Contract Info */}
              {(item.contract_status || item.website) && (
                <View style={styles.contractInfo}>
                  <Divider style={{ marginVertical: 8 }} />
                  <View style={styles.contractRow}>
                    {item.contract_status && (
                      <View style={styles.contractItem}>
                        <MaterialCommunityIcons
                          name="file-document"
                          size={14}
                          color={theme.colors.onSurfaceVariant}
                        />
                        <Text variant="bodySmall" style={{ marginLeft: 4 }}>
                          {item.contract_status}
                        </Text>
                      </View>
                    )}
                    {item.website && (
                      <View style={styles.contractItem}>
                        <MaterialCommunityIcons name="web" size={14} color={theme.colors.primary} />
                        <Text
                          variant="bodySmall"
                          style={{ marginLeft: 4, color: theme.colors.primary }}
                        >
                          Website
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </Card.Content>
          </>
        )}
      </Card>
    );
  };

  if (isLoading && suppliers.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16 }}>Loading suppliers...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <Surface style={styles.headerSurface} elevation={1}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons name="truck-delivery" size={28} color={theme.colors.primary} />
            <Text variant="titleLarge" style={{ marginLeft: 8, fontWeight: '600' }}>
              Suppliers
            </Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.filterToggle}>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, marginRight: 4 }}
              >
                {filterActive ? 'Active' : 'Inactive'}
              </Text>
              <Switch
                value={filterActive}
                onValueChange={setFilterActive}
                color={theme.colors.primary}
              />
            </View>
          </View>
        </View>

        <Searchbar
          placeholder="Search suppliers..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchbar}
        />

        {/* Stats row */}
        <View style={styles.statsRow}>
          <Chip
            compact
            icon={() => (
              <MaterialCommunityIcons name="account-group" size={14} color={theme.colors.primary} />
            )}
            style={styles.statChip}
          >
            {filteredSuppliers.length} suppliers
          </Chip>
          <Chip
            compact
            icon={() => (
              <MaterialCommunityIcons
                name="package-variant"
                size={14}
                color={theme.colors.primary}
              />
            )}
            style={styles.statChip}
          >
            {filteredSuppliers.reduce((sum, s) => sum + (s.ingredients?.length || 0), 0)} items
          </Chip>
        </View>
      </Surface>

      {/* Suppliers List */}
      {filteredSuppliers.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="truck-outline"
            size={64}
            color={theme.colors.onSurfaceVariant}
          />
          <Text
            variant="titleMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}
          >
            No {filterActive ? 'active' : 'inactive'} suppliers found
          </Text>
          <Button mode="contained" onPress={openCreate} style={{ marginTop: 16 }}>
            Add Supplier
          </Button>
        </View>
      ) : (
        <FlatList
          data={filteredSuppliers}
          keyExtractor={item => item.supplier_id.toString()}
          renderItem={renderSupplier}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      {/* FAB */}
      <FAB
        icon={() => <MaterialCommunityIcons name="plus" size={24} color="#fff" />}
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={openCreate}
      />

      {/* Dialogs */}
      <Portal>
        {/* Create Dialog */}
        <Dialog visible={showCreateDialog} onDismiss={() => setShowCreateDialog(false)}>
          <Dialog.Title>Add Supplier</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 400 }}>
            <ScrollView>
              <View style={styles.dialogContent}>
                <TextInput
                  label="Name *"
                  value={formData.name}
                  onChangeText={text => setFormData(f => ({ ...f, name: text }))}
                  mode="outlined"
                  style={styles.input}
                />
                <TextInput
                  label="Type"
                  value={formData.type}
                  onChangeText={text => setFormData(f => ({ ...f, type: text }))}
                  mode="outlined"
                  placeholder="e.g., Produce, Meat, Dairy"
                  style={styles.input}
                />
                <TextInput
                  label="Region"
                  value={formData.region}
                  onChangeText={text => setFormData(f => ({ ...f, region: text }))}
                  mode="outlined"
                  placeholder="e.g., Local, Regional, National"
                  style={styles.input}
                />
                <TextInput
                  label="Contact Info"
                  value={formData.contact_info}
                  onChangeText={text => setFormData(f => ({ ...f, contact_info: text }))}
                  mode="outlined"
                  style={styles.input}
                />
                <TextInput
                  label="Rating (1-5)"
                  value={formData.rating}
                  onChangeText={text => setFormData(f => ({ ...f, rating: text }))}
                  mode="outlined"
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
                <TextInput
                  label="Website"
                  value={formData.website}
                  onChangeText={text => setFormData(f => ({ ...f, website: text }))}
                  mode="outlined"
                  keyboardType="url"
                  style={styles.input}
                />
                <TextInput
                  label="Contract Status"
                  value={formData.contract_status}
                  onChangeText={text => setFormData(f => ({ ...f, contract_status: text }))}
                  mode="outlined"
                  placeholder="e.g., Active, Pending, Expired"
                  style={styles.input}
                />
                <View style={styles.switchRow}>
                  <Text>Active</Text>
                  <Switch
                    value={formData.is_active}
                    onValueChange={val => setFormData(f => ({ ...f, is_active: val }))}
                  />
                </View>
              </View>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button
              mode="contained"
              onPress={handleCreate}
              loading={creating}
              disabled={!formData.name.trim()}
            >
              Create
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog visible={!!editingSupplier} onDismiss={() => setEditingSupplier(null)}>
          <Dialog.Title>Edit Supplier</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 400 }}>
            <ScrollView>
              <View style={styles.dialogContent}>
                <TextInput
                  label="Name *"
                  value={formData.name}
                  onChangeText={text => setFormData(f => ({ ...f, name: text }))}
                  mode="outlined"
                  style={styles.input}
                />
                <TextInput
                  label="Type"
                  value={formData.type}
                  onChangeText={text => setFormData(f => ({ ...f, type: text }))}
                  mode="outlined"
                  placeholder="e.g., Produce, Meat, Dairy"
                  style={styles.input}
                />
                <TextInput
                  label="Region"
                  value={formData.region}
                  onChangeText={text => setFormData(f => ({ ...f, region: text }))}
                  mode="outlined"
                  placeholder="e.g., Local, Regional, National"
                  style={styles.input}
                />
                <TextInput
                  label="Contact Info"
                  value={formData.contact_info}
                  onChangeText={text => setFormData(f => ({ ...f, contact_info: text }))}
                  mode="outlined"
                  style={styles.input}
                />
                <TextInput
                  label="Rating (1-5)"
                  value={formData.rating}
                  onChangeText={text => setFormData(f => ({ ...f, rating: text }))}
                  mode="outlined"
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
                <TextInput
                  label="Website"
                  value={formData.website}
                  onChangeText={text => setFormData(f => ({ ...f, website: text }))}
                  mode="outlined"
                  keyboardType="url"
                  style={styles.input}
                />
                <TextInput
                  label="Contract Status"
                  value={formData.contract_status}
                  onChangeText={text => setFormData(f => ({ ...f, contract_status: text }))}
                  mode="outlined"
                  placeholder="e.g., Active, Pending, Expired"
                  style={styles.input}
                />
                <TextInput
                  label="Supplier Feedback"
                  value={formData.supplier_feedback}
                  onChangeText={text => setFormData(f => ({ ...f, supplier_feedback: text }))}
                  mode="outlined"
                  multiline
                  numberOfLines={2}
                  style={styles.input}
                />
                <View style={styles.switchRow}>
                  <Text>Active</Text>
                  <Switch
                    value={formData.is_active}
                    onValueChange={val => setFormData(f => ({ ...f, is_active: val }))}
                  />
                </View>
              </View>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button textColor="#f44336" onPress={() => setDeleteConfirm(editingSupplier)}>
              Delete
            </Button>
            <Button onPress={() => setEditingSupplier(null)}>Cancel</Button>
            <Button
              mode="contained"
              onPress={handleUpdate}
              loading={updating}
              disabled={!formData.name.trim()}
            >
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog visible={!!deleteConfirm} onDismiss={() => setDeleteConfirm(null)}>
          <Dialog.Title>Delete Supplier</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to delete "{deleteConfirm?.name}"?</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: 8 }}>
              This will also remove all ingredient-supplier associations.
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

        {/* Ingredient Edit Dialog */}
        <Dialog visible={!!editingIngredient} onDismiss={() => setEditingIngredient(null)}>
          <Dialog.Title>Edit: {editingIngredient?.ingredient_name}</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 450 }}>
            <ScrollView>
              <View style={styles.dialogContent}>
                <View style={styles.formRow}>
                  <TextInput
                    label="Unit"
                    value={ingredientForm.unit}
                    onChangeText={v => setIngredientForm(f => ({ ...f, unit: v }))}
                    mode="outlined"
                    style={styles.halfInput}
                    dense
                  />
                  <TextInput
                    label="Cost/Unit ($)"
                    value={ingredientForm.cost_per_unit}
                    onChangeText={v => setIngredientForm(f => ({ ...f, cost_per_unit: v }))}
                    mode="outlined"
                    keyboardType="decimal-pad"
                    style={styles.halfInput}
                    dense
                  />
                </View>
                <View style={styles.formRow}>
                  <TextInput
                    label="Lead Time (days)"
                    value={ingredientForm.lead_time_days}
                    onChangeText={v => setIngredientForm(f => ({ ...f, lead_time_days: v }))}
                    mode="outlined"
                    keyboardType="number-pad"
                    style={styles.halfInput}
                    dense
                  />
                  <TextInput
                    label="Shelf Life (days)"
                    value={ingredientForm.shelf_life_days}
                    onChangeText={v => setIngredientForm(f => ({ ...f, shelf_life_days: v }))}
                    mode="outlined"
                    keyboardType="number-pad"
                    style={styles.halfInput}
                    dense
                  />
                </View>
                <View style={styles.formRow}>
                  <TextInput
                    label="Spoilage Rate (%)"
                    value={ingredientForm.spoilage_rate}
                    onChangeText={v => setIngredientForm(f => ({ ...f, spoilage_rate: v }))}
                    mode="outlined"
                    keyboardType="decimal-pad"
                    style={styles.halfInput}
                    dense
                  />
                  <TextInput
                    label="Min Order Qty"
                    value={ingredientForm.min_order_quantity}
                    onChangeText={v => setIngredientForm(f => ({ ...f, min_order_quantity: v }))}
                    mode="outlined"
                    keyboardType="number-pad"
                    style={styles.halfInput}
                    dense
                  />
                </View>
                <View style={styles.formRow}>
                  <TextInput
                    label="Pack Size"
                    value={ingredientForm.pack_size}
                    onChangeText={v => setIngredientForm(f => ({ ...f, pack_size: v }))}
                    mode="outlined"
                    keyboardType="number-pad"
                    style={styles.halfInput}
                    dense
                  />
                  <TextInput
                    label="Qty Per Pack"
                    value={ingredientForm.quantity_per_pack_item}
                    onChangeText={v =>
                      setIngredientForm(f => ({ ...f, quantity_per_pack_item: v }))
                    }
                    mode="outlined"
                    keyboardType="decimal-pad"
                    style={styles.halfInput}
                    dense
                  />
                </View>
                <TextInput
                  label="Supplier Priority"
                  value={ingredientForm.supplier_priority}
                  onChangeText={v => setIngredientForm(f => ({ ...f, supplier_priority: v }))}
                  mode="outlined"
                  keyboardType="number-pad"
                  style={styles.input}
                  dense
                />
                <View style={styles.switchRow}>
                  <View style={styles.switchLabel}>
                    <MaterialCommunityIcons
                      name="star"
                      size={20}
                      color={ingredientForm.preferred ? '#ffc107' : theme.colors.onSurfaceVariant}
                    />
                    <Text style={{ marginLeft: 8 }}>Preferred Supplier</Text>
                  </View>
                  <Switch
                    value={ingredientForm.preferred}
                    onValueChange={v => setIngredientForm(f => ({ ...f, preferred: v }))}
                    color={theme.colors.primary}
                  />
                </View>
              </View>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setEditingIngredient(null)}>Cancel</Button>
            <Button mode="contained" onPress={handleSaveIngredient} loading={savingIngredient}>
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Snackbar */}
        <Dialog
          visible={snackbar.visible}
          onDismiss={() => setSnackbar(s => ({ ...s, visible: false }))}
          style={{ position: 'absolute', bottom: 80 }}
        >
          <Dialog.Content>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons
                name={snackbar.type === 'success' ? 'check-circle' : 'alert-circle'}
                size={20}
                color={snackbar.type === 'success' ? '#4caf50' : '#f44336'}
              />
              <Text style={{ marginLeft: 8 }}>{snackbar.message}</Text>
            </View>
          </Dialog.Content>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchbar: {
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    backgroundColor: 'transparent',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  supplierInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  supplierName: {
    fontWeight: '600',
  },
  statusChip: {
    height: 24,
    marginLeft: 4,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
    marginTop: 6,
  },
  infoChip: {
    backgroundColor: '#f5f5f5',
  },
  infoChipText: {
    fontSize: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  contactText: {
    marginLeft: 6,
    color: '#666',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  expandedContent: {
    paddingTop: 8,
  },
  ingredientGroup: {
    marginBottom: 8,
  },
  groupHeader: {
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  ingredientItem: {
    paddingVertical: 4,
    paddingLeft: 0,
  },
  ingredientTitle: {
    fontSize: 14,
  },
  ingredientDesc: {
    fontSize: 12,
  },
  ingredientIcon: {
    width: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contractInfo: {
    marginTop: 4,
  },
  contractRow: {
    flexDirection: 'row',
    gap: 16,
  },
  contractItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
  dialogContent: {
    padding: 8,
  },
  input: {
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  halfInput: {
    flex: 1,
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
