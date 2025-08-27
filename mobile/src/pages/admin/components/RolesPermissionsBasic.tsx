import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useRolePermissions } from '../hooks/useRolePermissions';
import {
  Provider as PaperProvider,
  Portal,
  Snackbar,
  Button,
  Card,
  Chip,
  Text,
  ActivityIndicator,
  IconButton,
  TextInput,
  Dialog,
  FAB,
  Divider,
  Badge,
  Searchbar,
} from 'react-native-paper';
import type { RolePermission, RoleWithPermissions } from '../../../interfaces/admin';

type EditableRole = Omit<RoleWithPermissions, 'permissions'> & {
  permission_names: string[];
};

export default function RolesPermissionsBasic() {
  const { roles, permissions, loading, error, syncData, deleteRole, isFetching, refetch } =
    useRolePermissions();

  const [localRoles, setLocalRoles] = useState<EditableRole[]>([]);
  const [dirty, setDirty] = useState(false);
  const [snack, setSnack] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; description?: string }>({ name: '' });
  const [permissionSearch, setPermissionSearch] = useState<Record<number, string>>({});
  const [permDetails, setPermDetails] = useState<{
    perm: RolePermission;
    roleIndex: number;
  } | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  // derive local editable copy when server roles change
  useEffect(() => {
    setLocalRoles(
      (roles || []).map(r => ({
        role_id: r.role_id,
        name: r.name,
        description: r.description,
        permission_names: r.permissions?.map(p => p.name) || [],
      }))
    );
    setDirty(false);
  }, [roles]);

  const togglePermission = (roleIndex: number, perm: string) => {
    setLocalRoles(prev =>
      prev.map((r, i) =>
        i !== roleIndex
          ? r
          : {
              ...r,
              permission_names: r.permission_names.includes(perm)
                ? r.permission_names.filter(p => p !== perm)
                : [...r.permission_names, perm],
            }
      )
    );
    setDirty(true);
  };

  const selectAll = (roleIndex: number) => {
    setLocalRoles(prev =>
      prev.map((r, i) =>
        i !== roleIndex ? r : { ...r, permission_names: permissions.map(p => p.name) }
      )
    );
    setDirty(true);
  };

  const clearAll = (roleIndex: number) => {
    setLocalRoles(prev =>
      prev.map((r, i) => (i !== roleIndex ? r : { ...r, permission_names: [] }))
    );
    setDirty(true);
  };

  const onAddRole = () => {
    setLocalRoles(prev => {
      const next = [
        ...prev,
        { role_id: null, name: 'New Role', description: '', permission_names: [] },
      ];
      // open edit for the new role
      setEditForm({ name: 'New Role', description: '' });
      setEditIdx(next.length - 1);
      // scroll to bottom to reveal the newly added card
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 0);
      return next;
    });
    setDirty(true);
    setSnack({ visible: true, message: 'New role added' });
  };

  const onEditRole = (idx: number) => {
    const r = localRoles[idx];
    setEditForm({ name: r.name || '', description: r.description || '' });
    setEditIdx(idx);
  };

  const onConfirmEdit = () => {
    if (editIdx === null) return;
    setLocalRoles(prev => prev.map((r, i) => (i !== editIdx ? r : { ...r, ...editForm })));
    setEditIdx(null);
    setDirty(true);
  };

  const onDeleteRole = async (idx: number) => {
    const r = localRoles[idx];
    setConfirmDeleteIdx(null);
    // if role exists on server, call delete immediately, otherwise just remove locally
    try {
      if (r.role_id != null) {
        await deleteRole(r.role_id);
      }
      setLocalRoles(prev => prev.filter((_, i) => i !== idx));
      setSnack({ visible: true, message: 'Role deleted' });
      // refresh server data after delete
      refetch?.();
    } catch (e) {
      setSnack({ visible: true, message: 'Failed to delete role' });
    }
  };

  const onSave = async () => {
    try {
      const payload = localRoles.map(r => ({
        role_id: r.role_id,
        name: r.name,
        description: r.description,
        permission_names: r.permission_names,
      }));
      await syncData(payload, []);
      setSnack({ visible: true, message: 'Changes saved' });
      setDirty(false);
    } catch (e) {
      setSnack({ visible: true, message: 'Failed to save changes' });
    }
  };

  const filteredPerms = useMemo(() => {
    // per-role filter cache
    return localRoles.map((_, idx) => {
      const q = (permissionSearch[idx] || '').toLowerCase();
      return q
        ? permissions.filter(
            p => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
          )
        : permissions;
    });
  }, [permissionSearch, permissions, localRoles.length]);

  if (loading) {
    return (
      <PaperProvider>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 24 }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8 }}>Loading roles…</Text>
        </View>
      </PaperProvider>
    );
  }

  if (error) {
    return (
      <PaperProvider>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text>Error loading roles</Text>
          <Button mode="contained" style={{ marginTop: 12 }} onPress={() => refetch?.()}>
            Retry
          </Button>
        </View>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider>
      <View style={{ flex: 1 }}>
        <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Text variant="titleLarge" style={{ flex: 1, fontWeight: '600' }}>
              Roles & Permissions
            </Text>
            <Button onPress={onAddRole} icon="plus" mode="outlined">
              Add Role
            </Button>
          </View>
          {isFetching && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <ActivityIndicator size={16} style={{ marginRight: 8 }} />
              <Text>Refreshing…</Text>
            </View>
          )}

          {localRoles.map((role, i) => {
            const activeCount = role.permission_names.length;
            const permsForRole: RolePermission[] = filteredPerms[i] || permissions;
            return (
              <Card key={(role.role_id ?? `new-${i}`).toString()} style={{ marginBottom: 12 }}>
                <Card.Title
                  title={role.name || 'New Role'}
                  subtitle={role.description || undefined}
                  left={props => (
                    <Badge {...props} size={28} style={{ marginRight: 8 }}>
                      {activeCount}
                    </Badge>
                  )}
                  right={() => (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <IconButton
                        icon="pencil"
                        accessibilityLabel="Edit role"
                        onPress={() => onEditRole(i)}
                      />
                      <IconButton
                        icon="delete"
                        accessibilityLabel="Delete role"
                        onPress={() => setConfirmDeleteIdx(i)}
                      />
                    </View>
                  )}
                />
                <Card.Content>
                  <Searchbar
                    placeholder="Search permissions"
                    value={permissionSearch[i] || ''}
                    onChangeText={text => setPermissionSearch(prev => ({ ...prev, [i]: text }))}
                    style={{ marginBottom: 8 }}
                  />
                  <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                    <Button compact onPress={() => selectAll(i)}>
                      Select all
                    </Button>
                    <Button compact onPress={() => clearAll(i)}>
                      Clear all
                    </Button>
                  </View>
                  <Divider style={{ marginBottom: 8 }} />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {permsForRole.map(p => {
                      const active = role.permission_names.includes(p.name);
                      return (
                        <Chip
                          key={p.name}
                          selected={active}
                          onPress={() => togglePermission(i, p.name)}
                          onLongPress={() => setPermDetails({ perm: p, roleIndex: i })}
                          style={{ margin: 4 }}
                          showSelectedCheck
                          icon={active ? 'check' : undefined}
                        >
                          {p.name}
                        </Chip>
                      );
                    })}
                  </View>
                </Card.Content>
              </Card>
            );
          })}
        </ScrollView>

        <Portal>
          {/* Permission Details */}
          <Dialog visible={!!permDetails} onDismiss={() => setPermDetails(null)}>
            <Dialog.Title>{permDetails?.perm.name || 'Permission'}</Dialog.Title>
            <Dialog.Content>
              <Text>
                {permDetails?.perm.description || 'No description provided for this permission.'}
              </Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setPermDetails(null)}>Close</Button>
              {permDetails && (
                <Button
                  onPress={() => {
                    const idx = permDetails.roleIndex;
                    const name = permDetails.perm.name;
                    togglePermission(idx, name);
                    setPermDetails(null);
                  }}
                >
                  {permDetails &&
                  localRoles[permDetails.roleIndex]?.permission_names.includes(
                    permDetails.perm.name
                  )
                    ? 'Disable'
                    : 'Enable'}
                </Button>
              )}
            </Dialog.Actions>
          </Dialog>

          {/* Edit Role Dialog */}
          <Dialog visible={editIdx !== null} onDismiss={() => setEditIdx(null)}>
            <Dialog.Title>Edit Role</Dialog.Title>
            <Dialog.Content>
              <TextInput
                label="Name"
                mode="outlined"
                value={editForm.name}
                onChangeText={text => setEditForm(prev => ({ ...prev, name: text }))}
                style={{ marginBottom: 12 }}
              />
              <TextInput
                label="Description (optional)"
                mode="outlined"
                value={editForm.description}
                onChangeText={text => setEditForm(prev => ({ ...prev, description: text }))}
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setEditIdx(null)}>Cancel</Button>
              <Button onPress={onConfirmEdit}>Save</Button>
            </Dialog.Actions>
          </Dialog>

          {/* Confirm Delete */}
          <Dialog visible={confirmDeleteIdx !== null} onDismiss={() => setConfirmDeleteIdx(null)}>
            <Dialog.Title>Delete Role</Dialog.Title>
            <Dialog.Content>
              <Text>Are you sure you want to delete this role?</Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setConfirmDeleteIdx(null)}>Cancel</Button>
              <Button
                onPress={() => confirmDeleteIdx !== null && onDeleteRole(confirmDeleteIdx)}
                icon="delete"
              >
                Delete
              </Button>
            </Dialog.Actions>
          </Dialog>

          {/* Snackbar */}
          <Snackbar
            visible={snack.visible}
            onDismiss={() => setSnack({ visible: false, message: '' })}
            duration={2500}
          >
            {snack.message}
          </Snackbar>
        </Portal>

        <FAB
          icon="content-save"
          label={dirty ? 'Save changes' : 'Saved'}
          onPress={onSave}
          disabled={!dirty}
          style={{ position: 'absolute', right: 16, bottom: 16 }}
        />
      </View>
    </PaperProvider>
  );
}
