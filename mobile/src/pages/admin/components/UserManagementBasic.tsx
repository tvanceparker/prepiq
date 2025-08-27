import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useEmployees } from '../hooks/useEmployees';
import {
  Provider as PaperProvider,
  Text,
  ActivityIndicator,
  Button,
  Chip,
  Card,
  IconButton,
  Dialog,
  Portal,
  TextInput,
  Snackbar,
  Searchbar,
  Divider,
  Badge,
} from 'react-native-paper';

export default function UserManagementBasic() {
  const {
    employees,
    roles,
    loading,
    error,
    addEmployee,
    editEmployee,
    removeEmployee,
    fetchEmployees,
  } = useEmployees();

  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive'>('active');
  const [roleFilter, setRoleFilter] = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');
  const [snack, setSnack] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<{ name: string; email: string; role_id: number | null }>({
    name: '',
    email: '',
    role_id: null,
  });
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return employees
      .filter(e => (statusFilter === 'active' ? e.is_active : !e.is_active))
      .filter(e => (roleFilter === 'all' ? true : e.role_id === roleFilter))
      .filter(e => !q || e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q))
      .map(e => ({ ...e, roleName: roles.find(r => r.role_id === e.role_id)?.name }));
  }, [employees, roles, statusFilter, roleFilter, search]);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const onAdd = () => {
    setEditId(null);
    setForm({ name: '', email: '', role_id: roles[0]?.role_id ?? null });
    setEditOpen(true);
  };

  const onEdit = (id: number) => {
    const e = employees.find(x => x.employee_id === id);
    if (!e) return;
    setEditId(id);
    setForm({ name: e.name, email: e.email, role_id: e.role_id });
    setEditOpen(true);
  };

  const onSave = async () => {
    try {
      if (!form.name || !form.email || !form.role_id) {
        setSnack({ visible: true, message: 'Name, email, and role are required' });
        return;
      }
      if (editId === null) {
        await addEmployee({ name: form.name, email: form.email, role_id: form.role_id });
        setSnack({ visible: true, message: 'Employee created' });
      } else {
        await editEmployee(editId, { name: form.name, email: form.email, role_id: form.role_id });
        setSnack({ visible: true, message: 'Employee updated' });
      }
      setEditOpen(false);
    } catch (e) {
      setSnack({ visible: true, message: 'Failed to save employee' });
    }
  };

  const onDeactivate = async (id: number) => {
    try {
      await removeEmployee(id);
      setSnack({ visible: true, message: 'Employee deactivated' });
    } catch (e) {
      setSnack({ visible: true, message: 'Failed to deactivate' });
    }
  };

  const toggleExpand = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <PaperProvider>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 24 }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8 }}>Loading employees…</Text>
        </View>
      </PaperProvider>
    );
  }

  if (error) {
    return (
      <PaperProvider>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text>Error loading employees</Text>
          <Button mode="contained" style={{ marginTop: 12 }} onPress={() => fetchEmployees()}>
            Retry
          </Button>
        </View>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider>
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Text variant="titleLarge" style={{ flex: 1, fontWeight: '600' }}>
              User Management
            </Text>
            <Button mode="outlined" icon="plus" onPress={onAdd}>
              Add User
            </Button>
          </View>
          <Searchbar
            placeholder="Search by name or email"
            value={search}
            onChangeText={setSearch}
            style={{ marginBottom: 8 }}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
            {(['active', 'inactive'] as const).map(s => (
              <Chip
                key={s}
                selected={statusFilter === s}
                onPress={() => setStatusFilter(s)}
                style={{ marginRight: 6, marginBottom: 6 }}
              >
                {s}
              </Chip>
            ))}
            <Divider style={{ marginHorizontal: 8 }} />
            <Chip
              selected={roleFilter === 'all'}
              onPress={() => setRoleFilter('all')}
              style={{ marginRight: 6, marginBottom: 6 }}
            >
              All roles
            </Chip>
            {roles.map(r => (
              <Chip
                key={r.role_id ?? `role-${r.name}`}
                selected={roleFilter === r.role_id}
                onPress={() => setRoleFilter(r.role_id as number)}
                style={{ marginRight: 6, marginBottom: 6 }}
              >
                {r.name}
              </Chip>
            ))}
          </View>

          {rows.map(r => (
            <Card
              key={r.employee_id}
              style={{ marginBottom: 10 }}
              onPress={() => toggleExpand(r.employee_id)}
            >
              <Card.Title
                title={r.name}
                subtitle={r.email}
                titleNumberOfLines={2}
                subtitleNumberOfLines={2}
                left={props => (
                  <Badge {...props} size={28} style={{ marginRight: 8 }}>
                    {r.roleName?.[0] ?? 'U'}
                  </Badge>
                )}
                right={() => (
                  <IconButton
                    icon={expanded[r.employee_id] ? 'chevron-up' : 'chevron-down'}
                    onPress={() => toggleExpand(r.employee_id)}
                  />
                )}
              />
              <Card.Content>
                {expanded[r.employee_id] && (
                  <View style={{ marginTop: 6, marginBottom: 8 }}>
                    <Text>Username: {r.username || '—'}</Text>
                    <Text>Phone: {r.phone || '—'}</Text>
                    <Divider style={{ marginTop: 8 }} />
                  </View>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Chip style={{ marginRight: 8 }} compact>
                    {r.roleName || 'No role'}
                  </Chip>
                  <View style={{ flexDirection: 'row', marginLeft: 'auto' }}>
                    <IconButton icon="pencil" onPress={() => onEdit(r.employee_id)} />
                    {r.is_active && (
                      <IconButton icon="account-off" onPress={() => setConfirmId(r.employee_id)} />
                    )}
                  </View>
                </View>
                <Text>Status: {r.is_active ? 'Active' : 'Inactive'}</Text>
              </Card.Content>
            </Card>
          ))}
        </ScrollView>

        <Portal>
          {/* Add/Edit dialog */}
          <Dialog visible={editOpen} onDismiss={() => setEditOpen(false)}>
            <Dialog.Title>{editId === null ? 'Add User' : 'Edit User'}</Dialog.Title>
            <Dialog.Content>
              <TextInput
                label="Name"
                mode="outlined"
                style={{ marginBottom: 8 }}
                value={form.name}
                onChangeText={t => setForm(prev => ({ ...prev, name: t }))}
              />
              <TextInput
                label="Email"
                mode="outlined"
                autoCapitalize="none"
                keyboardType="email-address"
                style={{ marginBottom: 8 }}
                value={form.email}
                onChangeText={t => setForm(prev => ({ ...prev, email: t }))}
              />
              <Text style={{ marginBottom: 6 }}>Role</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {roles.map(r => (
                  <Chip
                    key={r.role_id ?? `role-${r.name}`}
                    selected={form.role_id === r.role_id}
                    onPress={() => setForm(prev => ({ ...prev, role_id: r.role_id as number }))}
                    style={{ marginRight: 6, marginBottom: 6 }}
                  >
                    {r.name}
                  </Chip>
                ))}
              </View>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setEditOpen(false)}>Cancel</Button>
              <Button onPress={onSave}>Save</Button>
            </Dialog.Actions>
          </Dialog>

          {/* Deactivate confirm */}
          <Dialog visible={confirmId !== null} onDismiss={() => setConfirmId(null)}>
            <Dialog.Title>Deactivate User</Dialog.Title>
            <Dialog.Content>
              <Text>Are you sure you want to deactivate this user?</Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setConfirmId(null)}>Cancel</Button>
              <Button onPress={() => confirmId !== null && onDeactivate(confirmId)}>
                Deactivate
              </Button>
            </Dialog.Actions>
          </Dialog>

          <Snackbar
            visible={snack.visible}
            onDismiss={() => setSnack({ visible: false, message: '' })}
            duration={2500}
          >
            {snack.message}
          </Snackbar>
        </Portal>
      </View>
    </PaperProvider>
  );
}
