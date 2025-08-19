import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useEmployees } from '../hooks/useEmployees';

export default function UserManagementBasic() {
  const { employees, roles, loading, error } = useEmployees();
  const [filter, setFilter] = useState<'active' | 'inactive'>('active');
  const rows = useMemo(() => employees.filter(e => filter === 'active' ? e.is_active : !e.is_active).map(e => ({ ...e, roleName: roles.find(r => r.role_id === e.role_id)?.name })), [employees, roles, filter]);
  if (loading) return <Text>Loading employees...</Text>;
  if (error) return <Text>Error loading employees</Text>;
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 12 }}>User Management</Text>
      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        {(['active','inactive'] as const).map(s => (
          <TouchableOpacity key={s} onPress={() => setFilter(s)} style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: filter===s ? '#2563eb' : '#e5e7eb', borderRadius: 6, marginRight: 8 }}>
            <Text style={{ color: filter===s ? 'white' : '#111827' }}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {rows.map(r => (
        <View key={r.employee_id} style={{ borderWidth:1, borderColor:'#ddd', borderRadius:8, padding:12, marginBottom:10 }}>
          <Text style={{ fontWeight:'600' }}>{r.name}</Text>
          <Text>{r.email}</Text>
          <Text>{r.roleName}</Text>
          <Text>Status: {r.is_active ? 'Active' : 'Inactive'}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
