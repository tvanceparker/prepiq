// src/pages/menu/IngredientCatalog.tsx
import React, { useState, useMemo } from 'react';
import { View, StyleSheet, SectionList, ScrollView } from 'react-native';
import {
  Text,
  useTheme,
  Card,
  Button,
  TextInput,
  FAB,
  Portal,
  Dialog,
  Modal,
  Snackbar,
  ActivityIndicator,
  Chip,
  IconButton,
  Searchbar,
  List,
  Divider,
  Switch,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useIngredients } from '../../hooks/useMenu';
import { IngredientWithSuppliers } from '../../interfaces/menu';

interface IngredientSupplier {
  supplier_id: number;
  supplier_name: string;
  cost_per_unit: number;
  lead_time_days: number;
  preferred: boolean;
  unit?: string;
  pack_size?: number;
  quantity_per_pack_item?: number;
}

export default function IngredientCatalog() {
  const theme = useTheme();
  const {
    ingredientsWithSuppliers,
    loading: isLoadingIngredients,
    upsertIngredient,
    refresh,
  } = useIngredients();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<IngredientWithSuppliers | null>(
    null
  );
  const [editMode, setEditMode] = useState(false);

  // Local edit state
  const [editData, setEditData] = useState<any>(null);

  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  // Filter and group ingredients
  const filteredIngredients = useMemo(() => {
    if (!ingredientsWithSuppliers) return [];
    const q = search.toLowerCase();
    return ingredientsWithSuppliers.filter(
      (i: IngredientWithSuppliers) =>
        i.name.toLowerCase().includes(q) || (i.category && i.category.toLowerCase().includes(q))
    );
  }, [ingredientsWithSuppliers, search]);

  const sections = useMemo(() => {
    const categorySet = new Set<string>(
      filteredIngredients.map((i: IngredientWithSuppliers) => i.category || 'Uncategorized')
    );
    const categories = Array.from(categorySet).sort();
    return categories.map(cat => ({
      title: cat,
      data: filteredIngredients.filter(
        (i: IngredientWithSuppliers) => (i.category || 'Uncategorized') === cat
      ),
    }));
  }, [filteredIngredients]);

  // Open ingredient detail
  const openDetail = (ingredient: IngredientWithSuppliers) => {
    setSelectedIngredient(ingredient);
    setEditData({ ...ingredient });
    setEditMode(false);
  };

  // Open create dialog
  const openCreate = () => {
    setEditData({
      name: '',
      category: '',
      unit: '',
      cost_per_unit: '',
      suppliers: [],
    });
    setDialogOpen(true);
  };

  // Handle field change
  const handleFieldChange = (field: string, value: any) => {
    setEditData((prev: any) => ({ ...prev, [field]: value }));
  };

  // Handle supplier field change
  const handleSupplierChange = (index: number, field: string, value: any) => {
    const suppliers = [...(editData?.suppliers || [])];
    suppliers[index] = { ...suppliers[index], [field]: value };
    setEditData((prev: any) => ({ ...prev, suppliers }));
  };

  // Save changes
  const handleSave = async () => {
    if (!editData?.name?.trim()) {
      setSnackbar({ visible: true, message: 'Ingredient name is required' });
      return;
    }

    try {
      await upsertIngredient(editData);
      setSnackbar({ visible: true, message: 'Ingredient saved successfully' });
      setEditMode(false);
      setSelectedIngredient(null);
      setDialogOpen(false);
      refresh();
    } catch (err: unknown) {
      const error = err as Error;
      setSnackbar({ visible: true, message: error?.message || 'Failed to save' });
    }
  };

  // Get preferred supplier
  const getPreferredSupplier = (suppliers: IngredientSupplier[] = []) => {
    return suppliers.find(s => s.preferred) || suppliers[0];
  };

  // Render ingredient card
  const renderIngredientCard = ({ item }: { item: IngredientWithSuppliers }) => {
    const preferredSupplier = getPreferredSupplier(item.suppliers);
    const supplierCount = item.suppliers?.length || 0;

    return (
      <Card style={styles.ingredientCard} mode="outlined" onPress={() => openDetail(item)}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Text variant="titleMedium" style={styles.ingredientName}>
                {item.name}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {item.unit || 'No unit'} • {item.category || 'Uncategorized'}
              </Text>
            </View>
            {item.cost_per_unit !== undefined && item.cost_per_unit !== null && (
              <Chip compact mode="outlined" style={styles.costChip}>
                ${item.cost_per_unit.toFixed(2)}/{item.unit || 'unit'}
              </Chip>
            )}
          </View>

          {/* Supplier info */}
          {supplierCount > 0 && (
            <View style={styles.supplierSection}>
              <Divider style={{ marginVertical: 8 }} />
              <View style={styles.supplierRow}>
                <MaterialCommunityIcons
                  name="truck-delivery"
                  size={16}
                  color={theme.colors.primary}
                />
                <Text variant="bodySmall" style={styles.supplierText}>
                  {preferredSupplier?.supplier_name}
                  {preferredSupplier?.preferred && (
                    <Text style={{ color: theme.colors.primary }}> ★ Preferred</Text>
                  )}
                </Text>
              </View>
              {preferredSupplier?.cost_per_unit !== undefined && (
                <View style={styles.supplierDetailRow}>
                  <View style={styles.supplierDetail}>
                    <MaterialCommunityIcons
                      name="currency-usd"
                      size={14}
                      color={theme.colors.onSurfaceVariant}
                    />
                    <Text variant="labelSmall" style={styles.supplierDetailText}>
                      ${preferredSupplier.cost_per_unit.toFixed(2)}/
                      {preferredSupplier.unit || item.unit || 'unit'}
                    </Text>
                  </View>
                  {preferredSupplier?.lead_time_days !== undefined && (
                    <View style={styles.supplierDetail}>
                      <MaterialCommunityIcons
                        name="clock-outline"
                        size={14}
                        color={theme.colors.onSurfaceVariant}
                      />
                      <Text variant="labelSmall" style={styles.supplierDetailText}>
                        {preferredSupplier.lead_time_days} days lead
                      </Text>
                    </View>
                  )}
                </View>
              )}
              {supplierCount > 1 && (
                <Text variant="labelSmall" style={{ color: theme.colors.outline, marginTop: 4 }}>
                  +{supplierCount - 1} more supplier{supplierCount > 2 ? 's' : ''}
                </Text>
              )}
            </View>
          )}

          {supplierCount === 0 && (
            <View style={styles.noSupplierRow}>
              <Divider style={{ marginVertical: 8 }} />
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={14}
                color={theme.colors.outline}
              />
              <Text variant="labelSmall" style={{ color: theme.colors.outline, marginLeft: 4 }}>
                No suppliers linked
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text variant="headlineMedium" style={{ color: theme.colors.onBackground }}>
              Ingredient Catalog
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Ingredients with supplier info
            </Text>
          </View>
          <Chip
            icon={() => (
              <MaterialCommunityIcons name="food-variant" size={16} color={theme.colors.primary} />
            )}
          >
            {ingredientsWithSuppliers?.length || 0}
          </Chip>
        </View>
      </View>

      <Searchbar
        placeholder="Search ingredients..."
        value={search}
        onChangeText={setSearch}
        style={styles.searchbar}
      />

      {isLoadingIngredients ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : sections.length === 0 ? (
        <Card style={styles.emptyCard} mode="outlined">
          <Card.Content style={styles.emptyContent}>
            <MaterialCommunityIcons
              name="food-off"
              size={48}
              color={theme.colors.onSurfaceVariant}
            />
            <Text
              variant="bodyLarge"
              style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}
            >
              {search ? 'No matching ingredients' : 'No ingredients yet'}
            </Text>
            {!search && (
              <Button mode="contained" onPress={openCreate} style={{ marginTop: 16 }}>
                Add First Ingredient
              </Button>
            )}
          </Card.Content>
        </Card>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => String(item.ingredient_id)}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {section.title}
              </Text>
              <Chip compact>{section.data.length}</Chip>
            </View>
          )}
          renderItem={renderIngredientCard}
          contentContainerStyle={styles.listContent}
        />
      )}

      <FAB
        icon={() => <MaterialCommunityIcons name="plus" size={24} color={theme.colors.onPrimary} />}
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={openCreate}
      />

      {/* Ingredient Detail Modal */}
      <Portal>
        <Modal
          visible={!!selectedIngredient}
          onDismiss={() => setSelectedIngredient(null)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          {selectedIngredient && editData && (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderLeft}>
                  <Text variant="headlineSmall" style={{ fontWeight: '600' }}>
                    {editMode ? 'Edit Ingredient' : selectedIngredient.name}
                  </Text>
                  {!editMode && (
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {selectedIngredient.category || 'Uncategorized'}
                    </Text>
                  )}
                </View>
                <View style={styles.modalHeaderRight}>
                  <View style={styles.editModeToggle}>
                    <Text variant="labelSmall" style={{ marginRight: 4 }}>
                      Edit
                    </Text>
                    <Switch value={editMode} onValueChange={setEditMode} />
                  </View>
                  <IconButton
                    icon={() => (
                      <MaterialCommunityIcons
                        name="close"
                        size={24}
                        color={theme.colors.onSurface}
                      />
                    )}
                    onPress={() => setSelectedIngredient(null)}
                  />
                </View>
              </View>

              <Divider style={{ marginVertical: 12 }} />

              {/* Basic Info */}
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Basic Information
              </Text>
              {editMode ? (
                <>
                  <TextInput
                    label="Name"
                    value={editData.name}
                    onChangeText={v => handleFieldChange('name', v)}
                    mode="outlined"
                    style={styles.input}
                  />
                  <TextInput
                    label="Unit"
                    value={editData.unit || ''}
                    onChangeText={v => handleFieldChange('unit', v)}
                    mode="outlined"
                    style={styles.input}
                  />
                  <TextInput
                    label="Category"
                    value={editData.category || ''}
                    onChangeText={v => handleFieldChange('category', v)}
                    mode="outlined"
                    style={styles.input}
                  />
                </>
              ) : (
                <Card mode="outlined" style={styles.infoCard}>
                  <Card.Content>
                    <List.Item
                      title="Unit"
                      description={selectedIngredient.unit || 'Not specified'}
                      left={() => (
                        <MaterialCommunityIcons
                          name="scale"
                          size={24}
                          color={theme.colors.primary}
                          style={{ marginLeft: 8 }}
                        />
                      )}
                    />
                    <List.Item
                      title="Category"
                      description={selectedIngredient.category || 'Uncategorized'}
                      left={() => (
                        <MaterialCommunityIcons
                          name="tag"
                          size={24}
                          color={theme.colors.primary}
                          style={{ marginLeft: 8 }}
                        />
                      )}
                    />
                    {selectedIngredient.cost_per_unit !== undefined && (
                      <List.Item
                        title="Base Cost"
                        description={`$${selectedIngredient.cost_per_unit?.toFixed(2) || '0.00'}/${
                          selectedIngredient.unit || 'unit'
                        }`}
                        left={() => (
                          <MaterialCommunityIcons
                            name="currency-usd"
                            size={24}
                            color={theme.colors.primary}
                            style={{ marginLeft: 8 }}
                          />
                        )}
                      />
                    )}
                  </Card.Content>
                </Card>
              )}

              {/* Suppliers Section */}
              <Text variant="titleMedium" style={[styles.sectionTitle, { marginTop: 16 }]}>
                Suppliers ({selectedIngredient.suppliers?.length || 0})
              </Text>

              {(selectedIngredient.suppliers || []).length === 0 ? (
                <Card mode="outlined" style={styles.infoCard}>
                  <Card.Content style={{ alignItems: 'center', padding: 24 }}>
                    <MaterialCommunityIcons
                      name="truck-outline"
                      size={40}
                      color={theme.colors.outline}
                    />
                    <Text
                      variant="bodyMedium"
                      style={{ color: theme.colors.outline, marginTop: 8 }}
                    >
                      No suppliers linked
                    </Text>
                  </Card.Content>
                </Card>
              ) : (
                (editMode ? editData.suppliers : selectedIngredient.suppliers || []).map(
                  (supplier: IngredientSupplier, index: number) => (
                    <Card
                      key={`supplier-${index}-${supplier.supplier_id}`}
                      mode="outlined"
                      style={[
                        styles.supplierCard,
                        supplier.preferred && { borderColor: theme.colors.primary, borderWidth: 2 },
                      ]}
                    >
                      <Card.Content>
                        <View style={styles.supplierCardHeader}>
                          <View style={styles.supplierNameRow}>
                            <MaterialCommunityIcons
                              name="truck-delivery"
                              size={20}
                              color={
                                supplier.preferred
                                  ? theme.colors.primary
                                  : theme.colors.onSurfaceVariant
                              }
                            />
                            <Text
                              variant="titleMedium"
                              style={[
                                styles.supplierCardName,
                                supplier.preferred && { color: theme.colors.primary },
                              ]}
                            >
                              {supplier.supplier_name}
                            </Text>
                          </View>
                          {editMode ? (
                            <View style={styles.preferredToggle}>
                              <Text variant="labelSmall" style={{ marginRight: 4 }}>
                                Preferred
                              </Text>
                              <Switch
                                value={supplier.preferred}
                                onValueChange={v => handleSupplierChange(index, 'preferred', v)}
                              />
                            </View>
                          ) : (
                            supplier.preferred && (
                              <Chip
                                compact
                                icon={() => (
                                  <MaterialCommunityIcons
                                    name="star"
                                    size={14}
                                    color={theme.colors.primary}
                                  />
                                )}
                              >
                                Preferred
                              </Chip>
                            )
                          )}
                        </View>

                        {editMode ? (
                          <View>
                            {/* Row 1: Cost and Unit */}
                            <View style={styles.supplierEditRow}>
                              <TextInput
                                label="Cost/Unit ($)"
                                value={supplier.cost_per_unit?.toString() || ''}
                                onChangeText={v =>
                                  handleSupplierChange(index, 'cost_per_unit', parseFloat(v) || 0)
                                }
                                mode="outlined"
                                keyboardType="numeric"
                                style={[styles.input, { flex: 1 }]}
                                dense
                              />
                              <TextInput
                                label="Unit"
                                value={supplier.unit || ''}
                                onChangeText={v => handleSupplierChange(index, 'unit', v)}
                                mode="outlined"
                                style={[styles.input, { flex: 1 }]}
                                dense
                              />
                            </View>
                            {/* Row 2: Lead Time */}
                            <TextInput
                              label="Lead Time (days)"
                              value={supplier.lead_time_days?.toString() || ''}
                              onChangeText={v =>
                                handleSupplierChange(index, 'lead_time_days', parseInt(v) || 0)
                              }
                              mode="outlined"
                              keyboardType="numeric"
                              style={styles.input}
                              dense
                            />
                            {/* Row 3: Pack Size and Qty per Pack */}
                            <View style={styles.supplierEditRow}>
                              <TextInput
                                label="Pack Size"
                                value={supplier.pack_size?.toString() || ''}
                                onChangeText={v =>
                                  handleSupplierChange(index, 'pack_size', parseInt(v) || null)
                                }
                                mode="outlined"
                                keyboardType="numeric"
                                style={[styles.input, { flex: 1 }]}
                                dense
                              />
                              <TextInput
                                label="Qty/Pack Item"
                                value={supplier.quantity_per_pack_item?.toString() || ''}
                                onChangeText={v =>
                                  handleSupplierChange(
                                    index,
                                    'quantity_per_pack_item',
                                    parseInt(v) || null
                                  )
                                }
                                mode="outlined"
                                keyboardType="numeric"
                                style={[styles.input, { flex: 1 }]}
                                dense
                              />
                            </View>
                          </View>
                        ) : (
                          <View style={styles.supplierDetails}>
                            <View style={styles.supplierDetailItem}>
                              <MaterialCommunityIcons
                                name="currency-usd"
                                size={16}
                                color={theme.colors.onSurfaceVariant}
                              />
                              <Text variant="bodyMedium" style={{ marginLeft: 4 }}>
                                ${supplier.cost_per_unit?.toFixed(2) || '0.00'}/
                                {supplier.unit || selectedIngredient.unit || 'unit'}
                              </Text>
                            </View>
                            <View style={styles.supplierDetailItem}>
                              <MaterialCommunityIcons
                                name="clock-outline"
                                size={16}
                                color={theme.colors.onSurfaceVariant}
                              />
                              <Text variant="bodyMedium" style={{ marginLeft: 4 }}>
                                {supplier.lead_time_days || 0} days lead time
                              </Text>
                            </View>
                            {(supplier.pack_size || supplier.quantity_per_pack_item) && (
                              <View style={styles.supplierDetailItem}>
                                <MaterialCommunityIcons
                                  name="package-variant"
                                  size={16}
                                  color={theme.colors.onSurfaceVariant}
                                />
                                <Text variant="bodyMedium" style={{ marginLeft: 4 }}>
                                  Pack: {supplier.pack_size || 1} ×{' '}
                                  {supplier.quantity_per_pack_item || 1}{' '}
                                  {supplier.unit || selectedIngredient.unit || 'units'}
                                </Text>
                              </View>
                            )}
                          </View>
                        )}
                      </Card.Content>
                    </Card>
                  )
                )
              )}

              {/* Action Buttons */}
              {editMode && (
                <View style={styles.modalActions}>
                  <Button
                    mode="outlined"
                    onPress={() => setEditMode(false)}
                    style={{ flex: 1, marginRight: 8 }}
                  >
                    Cancel
                  </Button>
                  <Button mode="contained" onPress={handleSave} style={{ flex: 1 }}>
                    Save Changes
                  </Button>
                </View>
              )}
            </ScrollView>
          )}
        </Modal>

        {/* Create Dialog */}
        <Dialog visible={dialogOpen} onDismiss={() => setDialogOpen(false)}>
          <Dialog.Title>New Ingredient</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Name *"
              value={editData?.name || ''}
              onChangeText={v => handleFieldChange('name', v)}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Category"
              value={editData?.category || ''}
              onChangeText={v => handleFieldChange('category', v)}
              mode="outlined"
              style={styles.input}
              placeholder="e.g., Produce, Dairy, Protein"
            />
            <TextInput
              label="Unit"
              value={editData?.unit || ''}
              onChangeText={v => handleFieldChange('unit', v)}
              mode="outlined"
              style={styles.input}
              placeholder="e.g., lb, kg, oz, each"
            />
            <TextInput
              label="Cost/Unit ($)"
              value={editData?.cost_per_unit?.toString() || ''}
              onChangeText={v => handleFieldChange('cost_per_unit', v)}
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogOpen(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleSave}>
              Create
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={3000}
      >
        {snackbar.message}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchbar: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    marginTop: 8,
  },
  ingredientCard: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderLeft: {
    flex: 1,
  },
  ingredientName: {
    fontWeight: '600',
  },
  costChip: {
    marginLeft: 8,
  },
  supplierSection: {
    marginTop: 4,
  },
  supplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  supplierText: {
    marginLeft: 6,
    flex: 1,
  },
  supplierDetailRow: {
    flexDirection: 'row',
    marginTop: 4,
    flexWrap: 'wrap',
    gap: 12,
  },
  supplierDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  supplierDetailText: {
    marginLeft: 4,
    color: '#666',
  },
  noSupplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyCard: {
    margin: 16,
    marginTop: 32,
  },
  emptyContent: {
    alignItems: 'center',
    padding: 32,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  // Modal styles
  modal: {
    margin: 16,
    borderRadius: 12,
    padding: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalHeaderLeft: {
    flex: 1,
  },
  modalHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editModeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  infoCard: {
    marginBottom: 8,
  },
  supplierCard: {
    marginBottom: 8,
  },
  supplierCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  supplierNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  supplierCardName: {
    marginLeft: 8,
    fontWeight: '600',
  },
  supplierEditFields: {
    flexDirection: 'row',
    gap: 8,
  },
  supplierEditRow: {
    flexDirection: 'row',
    gap: 8,
  },
  preferredToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  supplierDetails: {
    gap: 4,
  },
  supplierDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
});
