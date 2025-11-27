// src/pages/team/Employees.tsx
import React, { useState, useCallback, useContext } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import {
  Surface,
  Text,
  Card,
  Button,
  Chip,
  ActivityIndicator,
  Portal,
  Dialog,
  TextInput,
  FAB,
  Avatar,
  IconButton,
  useTheme,
  Searchbar,
} from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEmployees } from '../../hooks/useTeam';
import { AuthContext } from '../../contexts/AuthContext';
import { Employee } from '../../interfaces/team';

export default function Employees(): React.ReactElement {
  const theme = useTheme();
  const { tier } = useContext(AuthContext) || {};
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role_id: 0,
    hourly_rate: '',
    is_active: true,
    password: '',
  });

  // Queries & mutations
  const { employees = [], loading: isLoading, refresh, createEmployee, creating, updateEmployee, updating } = useEmployees();

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    refresh();
    setRefreshing(false);
  }, [refresh]);

  // Filter employees
  const filteredEmployees = React.useMemo(() => {
    if (!searchQuery) return employees;
    const query = searchQuery.toLowerCase();
    return employees.filter(
      (emp: Employee) =>
        emp.name?.toLowerCase().includes(query) ||
        emp.email?.toLowerCase().includes(query) ||
        emp.role_name?.toLowerCase().includes(query)
    );
  }, [employees, searchQuery]);

  // Stats
  const activeCount = employees.filter((e: Employee) => e.is_active !== false).length;

  // Open create dialog
  const openCreate = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role_id: 0,
      hourly_rate: '',
      is_active: true,
      password: '',
    });
    setShowCreateDialog(true);
  };

  // Open edit dialog
  const openEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      role_id: employee.role_id || 0,
      hourly_rate: employee.hourly_rate?.toString() || '',
      is_active: employee.is_active !== false,
      password: '',
    });
  };

  // Handle create
  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    await createEmployee({
      name: formData.name,
      email: formData.email || '',
      phone: formData.phone || undefined,
      role_id: formData.role_id || 1,
      hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : undefined,
      is_active: formData.is_active,
      password: formData.password || 'changeme',
    });
    setShowCreateDialog(false);
  };

  // Handle update
  const handleUpdate = async () => {
    if (!editingEmployee || !formData.name.trim()) return;
    await updateEmployee({
      id: editingEmployee.employee_id,
      data: {
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        role_id: formData.role_id || undefined,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : undefined,
        is_active: formData.is_active,
      },
    });
    setEditingEmployee(null);
  };

  // Get initials
  const getInitials = (employee: Employee) => {
    const parts = (employee.name || '').split(' ');
    const first = parts[0]?.[0] || '';
    const last = parts[1]?.[0] || '';
    return (first + last).toUpperCase() || '??';
  };

  // Get role color
  const getRoleColor = (role?: string) => {
    switch (role?.toLowerCase()) {
      case 'manager':
        return '#9c27b0';
      case 'chef':
      case 'cook':
        return '#ff9800';
      case 'server':
      case 'waiter':
        return '#2196f3';
      case 'cashier':
        return '#4caf50';
      default:
        return theme.colors.primary;
    }
  };

  const renderItem = ({ item }: { item: Employee }) => {
    const isActive = item.is_active !== false;

    return (
      <Card style={[styles.card, !isActive && styles.inactiveCard]} mode="outlined">
        <Card.Content style={styles.cardContent}>
          <Avatar.Text
            size={48}
            label={getInitials(item)}
            style={{ backgroundColor: getRoleColor(item.role_name) }}
          />

          <View style={styles.employeeInfo}>
            <View style={styles.nameRow}>
              <Text variant="titleMedium" style={styles.employeeName}>
                {item.name}
              </Text>
              {!isActive && (
                <Chip compact style={styles.inactiveChip} textStyle={{ fontSize: 10, color: '#fff' }}>
                  Inactive
                </Chip>
              )}
            </View>

            {item.role_name && (
              <Chip
                compact
                style={[styles.roleChip, { backgroundColor: getRoleColor(item.role_name) }]}
                textStyle={{ color: '#fff', fontSize: 10 }}
              >
                {item.role_name}
              </Chip>
            )}

            <View style={styles.contactInfo}>
              {item.email && (
                <View style={styles.contactRow}>
                  <MaterialCommunityIcons name="email" size={12} color={theme.colors.onSurfaceVariant} />
                  <Text variant="bodySmall" style={styles.contactText} numberOfLines={1}>
                    {item.email}
                  </Text>
                </View>
              )}
              {item.phone && (
                <View style={styles.contactRow}>
                  <MaterialCommunityIcons name="phone" size={12} color={theme.colors.onSurfaceVariant} />
                  <Text variant="bodySmall" style={styles.contactText}>
                    {item.phone}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <IconButton icon="pencil" size={20} onPress={() => openEdit(item)} />
        </Card.Content>
      </Card>
    );
  };

  if (isLoading && employees.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16 }}>Loading employees...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <Surface style={styles.headerSurface} elevation={1}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons name="account-group" size={28} color={theme.colors.primary} />
            <Text variant="titleLarge" style={{ marginLeft: 8, fontWeight: '600' }}>
              Team
            </Text>
          </View>
          <View style={styles.statsChips}>
            <Chip icon="account-check">{activeCount} active</Chip>
          </View>
        </View>

        <Searchbar
          placeholder="Search employees..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchbar}
        />
      </Surface>

      {/* Employees List */}
      {filteredEmployees.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="account-off"
            size={64}
            color={theme.colors.onSurfaceVariant}
          />
          <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>
            No employees found
          </Text>
          <Button mode="contained" onPress={openCreate} style={{ marginTop: 16 }}>
            Add Employee
          </Button>
        </View>
      ) : (
        <FlatList
          data={filteredEmployees}
          keyExtractor={item => item.employee_id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {/* FAB */}
      <FAB
        icon="account-plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={openCreate}
      />

      {/* Create/Edit Dialog */}
      <Portal>
        <Dialog
          visible={showCreateDialog || !!editingEmployee}
          onDismiss={() => {
            setShowCreateDialog(false);
            setEditingEmployee(null);
          }}
        >
          <Dialog.Title>{editingEmployee ? 'Edit Employee' : 'Add Employee'}</Dialog.Title>
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
                label="Email *"
                value={formData.email}
                onChangeText={text => setFormData(f => ({ ...f, email: text }))}
                mode="outlined"
                keyboardType="email-address"
                style={styles.input}
              />
              <TextInput
                label="Phone"
                value={formData.phone}
                onChangeText={text => setFormData(f => ({ ...f, phone: text }))}
                mode="outlined"
                keyboardType="phone-pad"
                style={styles.input}
              />
              <TextInput
                label="Role ID"
                value={formData.role_id ? formData.role_id.toString() : ''}
                onChangeText={text => setFormData(f => ({ ...f, role_id: parseInt(text) || 0 }))}
                mode="outlined"
                keyboardType="number-pad"
                style={styles.input}
              />
              <TextInput
                label="Hourly Rate"
                value={formData.hourly_rate}
                onChangeText={text => setFormData(f => ({ ...f, hourly_rate: text }))}
                mode="outlined"
                keyboardType="decimal-pad"
                left={<TextInput.Affix text="$" />}
                style={styles.input}
              />
              {!editingEmployee && (
                <TextInput
                  label="Password *"
                  value={formData.password}
                  onChangeText={text => setFormData(f => ({ ...f, password: text }))}
                  mode="outlined"
                  secureTextEntry
                  style={styles.input}
                />
              )}
            </View>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setShowCreateDialog(false);
                setEditingEmployee(null);
              }}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={editingEmployee ? handleUpdate : handleCreate}
              loading={creating || updating}
              disabled={!formData.name.trim()}
            >
              {editingEmployee ? 'Save' : 'Add'}
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
  statsChips: {
    flexDirection: 'row',
    gap: 8,
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
  inactiveCard: {
    opacity: 0.6,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  employeeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  employeeName: {
    fontWeight: '600',
  },
  inactiveChip: {
    height: 20,
    backgroundColor: '#9e9e9e',
  },
  roleChip: {
    alignSelf: 'flex-start',
    marginTop: 4,
    height: 22,
  },
  contactInfo: {
    marginTop: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  contactText: {
    marginLeft: 4,
    color: '#666',
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
  row: {
    flexDirection: 'row',
  },
});
