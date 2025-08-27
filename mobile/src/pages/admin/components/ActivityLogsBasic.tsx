import React, { useMemo, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import {
  Text,
  Card,
  ActivityIndicator,
  Searchbar,
  Chip,
  Snackbar,
  Button,
} from 'react-native-paper';
import { useAdminActivityLogs } from '../hooks/useActivityLogs';

export default function ActivityLogsBasic() {
  const { data, isLoading, error, refetch, isRefetching } = useAdminActivityLogs();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'errors' | 'mine'>('all');
  const [snack, setSnack] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    let logs = data || [];
    if (filter === 'errors') {
      logs = logs.filter(l => (l.action || '').toLowerCase().includes('error'));
    }
    // 'mine' filter is placeholder unless we wire current user context; leave it as 'all' for now
    if (q) {
      logs = logs.filter(
        l =>
          (l.employee_name || '').toLowerCase().includes(q) ||
          (l.action || '').toLowerCase().includes(q) ||
          (l.details || '').toLowerCase().includes(q)
      );
    }
    return logs;
  }, [data, search, filter]);
  if (isLoading)
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  if (error)
    return (
      <View style={styles.center}>
        <Text style={{ marginBottom: 12 }}>Error loading activity logs</Text>
        <Button mode="contained" onPress={() => refetch()}>
          Retry
        </Button>
      </View>
    );
  return (
    <View style={{ flex: 1 }}>
      <Searchbar
        placeholder="Search action, details, or name"
        value={search}
        onChangeText={setSearch}
        style={{ margin: 16, marginBottom: 8 }}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16 }}>
        {(['all', 'errors', 'mine'] as const).map(k => (
          <Chip
            key={k}
            selected={filter === k}
            onPress={() => setFilter(k)}
            style={{ marginRight: 6, marginBottom: 6 }}
          >
            {k}
          </Chip>
        ))}
      </View>
      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={rows}
        keyExtractor={item => String(item.activity_id)}
        refreshing={isRefetching}
        onRefresh={async () => {
          const res = await refetch();
          if (!res.error) setSnack({ visible: true, message: 'Logs refreshed' });
        }}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Title title={item.action} subtitle={item.employee_name || 'Unknown'} />
            <Card.Content>
              {!!item.details && <Text>{item.details}</Text>}
              <Text variant="bodySmall" style={styles.date}>
                {new Date(item.created_at).toLocaleString()}
              </Text>
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={<Text>No activity logs.</Text>}
      />
      <Snackbar
        visible={snack.visible}
        onDismiss={() => setSnack({ visible: false, message: '' })}
        duration={2000}
      >
        {snack.message}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { marginBottom: 12 },
  date: { marginTop: 4, opacity: 0.7 },
});
