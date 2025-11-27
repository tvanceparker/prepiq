// src/pages/inventory/Suppliers.tsx
import React, { useState, useCallback, useContext } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
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
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useSuppliers } from '../../hooks/useSuppliers';
import { AuthContext } from '../../contexts/AuthContext';
import { SupplierDTO } from '../../interfaces/inventory';

export default function Suppliers(): React.JSX.Element {
  const theme = useTheme();
  const { tier } = useContext(AuthContext) || {};
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierDTO | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<SupplierDTO | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    notes: '',
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
    refresh();
    setRefreshing(false);
  }, [refresh]);

  // Filter suppliers
  const filteredSuppliers = React.useMemo(() => {
    if (!searchQuery) return suppliers;
    const query = searchQuery.toLowerCase();
    return suppliers.filter(
      s =>
        s.name.toLowerCase().includes(query) ||
        s.contact_email?.toLowerCase().includes(query)
    );
  }, [suppliers, searchQuery]);

  // Open create dialog
  const openCreate = () => {
    setFormData({ name: '', contact_email: '', contact_phone: '', address: '', notes: '' });
    setShowCreateDialog(true);
  };

  // Open edit dialog
  const openEdit = (supplier: SupplierDTO) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact_email: supplier.contact_email || '',
      contact_phone: supplier.contact_phone || '',
      address: supplier.address || '',
      notes: supplier.notes || '',
    });
  };

  // Handle create
  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    await createSupplier(formData);
    setShowCreateDialog(false);
  };

  // Handle update
  const handleUpdate = async () => {
    if (!editingSupplier || !formData.name.trim()) return;
    await updateSupplier({
      ...formData,
      supplier_id: editingSupplier.supplier_id,
    });
    setEditingSupplier(null);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteSupplier(deleteConfirm.supplier_id);
    setDeleteConfirm(null);
  };

  const renderSupplier = ({ item }: { item: SupplierDTO }) => (
    <Card style={styles.card} mode="outlined">
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.supplierInfo}>
            <Text variant="titleMedium" style={styles.supplierName}>
              {item.name}
            </Text>
            {item.contact_email && (
              <View style={styles.contactRow}>
                <MaterialCommunityIcons name="email" size={14} color={theme.colors.onSurfaceVariant} />
                <Text variant="bodySmall" style={styles.contactText}>
                  {item.contact_email}
                </Text>
              </View>
            )}
            {item.contact_phone && (
              <View style={styles.contactRow}>
                <MaterialCommunityIcons name="phone" size={14} color={theme.colors.onSurfaceVariant} />
                <Text variant="bodySmall" style={styles.contactText}>
                  {item.contact_phone}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.cardActions}>
            <IconButton icon="pencil" size={18} onPress={() => openEdit(item)} />
            <IconButton icon="delete" size={18} iconColor="#f44336" onPress={() => setDeleteConfirm(item)} />
          </View>
        </View>

        {item.address && (
          <View style={[styles.contactRow, { marginTop: 8 }]}>
            <MaterialCommunityIcons name="map-marker" size={14} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={styles.contactText} numberOfLines={2}>
              {item.address}
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );

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
          <Chip icon="account-group">{suppliers.length}</Chip>
        </View>

        <Searchbar
          placeholder="Search suppliers..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchbar}
        />
      </Surface>

      {/* Suppliers List */}
      {filteredSuppliers.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="truck-outline"
            size={64}
            color={theme.colors.onSurfaceVariant}
          />
          <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>
            No suppliers found
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
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {/* FAB */}
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={openCreate}
      />

      {/* Create Dialog */}
      <Portal>
        <Dialog visible={showCreateDialog} onDismiss={() => setShowCreateDialog(false)}>
          <Dialog.Title>Add Supplier</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Name *"
              value={formData.name}
              onChangeText={text => setFormData(f => ({ ...f, name: text }))}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Email"
              value={formData.contact_email}
              onChangeText={text => setFormData(f => ({ ...f, contact_email: text }))}
              mode="outlined"
              keyboardType="email-address"
              style={styles.input}
            />
            <TextInput
              label="Phone"
              value={formData.contact_phone}
              onChangeText={text => setFormData(f => ({ ...f, contact_phone: text }))}
              mode="outlined"
              keyboardType="phone-pad"
              style={styles.input}
            />
            <TextInput
              label="Address"
              value={formData.address}
              onChangeText={text => setFormData(f => ({ ...f, address: text }))}
              mode="outlined"
              multiline
              style={styles.input}
            />
          </Dialog.Content>
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
          <Dialog.Content>
            <TextInput
              label="Name *"
              value={formData.name}
              onChangeText={text => setFormData(f => ({ ...f, name: text }))}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Email"
              value={formData.contact_email}
              onChangeText={text => setFormData(f => ({ ...f, contact_email: text }))}
              mode="outlined"
              keyboardType="email-address"
              style={styles.input}
            />
            <TextInput
              label="Phone"
              value={formData.contact_phone}
              onChangeText={text => setFormData(f => ({ ...f, contact_phone: text }))}
              mode="outlined"
              keyboardType="phone-pad"
              style={styles.input}
            />
            <TextInput
              label="Address"
              value={formData.address}
              onChangeText={text => setFormData(f => ({ ...f, address: text }))}
              mode="outlined"
              multiline
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
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
    marginBottom: 0,
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
  supplierName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  contactText: {
    marginLeft: 6,
    color: '#666',
  },
  cardActions: {
    flexDirection: 'row',
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
});
