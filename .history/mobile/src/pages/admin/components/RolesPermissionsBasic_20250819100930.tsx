import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRolePermissions } from '../hooks/useRolePermissions';

export default function RolesPermissionsBasic() {
  const { roles, permissions, loading, error } = useRolePermissions();
  const [localRoles, setLocalRoles] = useState<any[]>([]);
  useEffect(() => {
    if (roles.length) {
      setLocalRoles(roles.map(r => ({ ...r, permission_names: r.permissions?.map(p => p.name) || [] })));
    }
  }, [roles]);
  const togglePermission = (roleIndex: number, perm: string) => {
    setLocalRoles(prev => prev.map((r, i) => i !== roleIndex ? r : ({ ...r, permission_names: r.permission_names?.includes(perm) ? r.permission_names.filter((p: string) => p !== perm) : [...(r.permission_names||[]), perm] })));
  };
  if (loading) return <Text>Loading roles...</Text>;
  if (error) return <Text>Error loading roles</Text>;
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 12 }}>Roles & Permissions</Text>
      {localRoles.map((role, i) => (
        <View key={role.role_id || i} style={{ marginBottom: 16, padding: 12, borderWidth: 1, borderRadius: 8, borderColor: '#ccc' }}>
          <Text style={{ fontWeight: '600', marginBottom: 4 }}>{role.name || 'New Role'}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {permissions.map(p => {
              const active = (role.permission_names||[]).includes(p.name);
              return (
                <TouchableOpacity key={p.name} onPress={() => togglePermission(i, p.name)} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, margin: 4, backgroundColor: active ? '#2563eb' : '#e5e7eb' }}>
                  <Text style={{ color: active ? 'white' : '#111827', fontSize: 12 }}>{p.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
