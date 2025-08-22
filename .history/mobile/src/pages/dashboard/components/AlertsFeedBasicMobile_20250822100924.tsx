import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useTheme } from 'react-native-paper';
import useAlertsFeed from '../hooks/useAlertsFeed';

export default function AlertsFeedBasicMobile() {
  const theme = useTheme();
  const [viewAll, setViewAll] = useState(false);
  const { alerts, loading, error, hasMore, loadMore, acknowledge, resolve, setFeedMode } =
    useAlertsFeed();
  useEffect(() => {
    setFeedMode(viewAll ? 'all' : 'active');
  }, [viewAll]);
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 12 }}>Alerts & Issues</Text>
      {error && <Text style={{ color: theme.colors.error, marginBottom: 8 }}>{error}</Text>}
      <TouchableOpacity
        onPress={() => setViewAll(v => !v)}
        style={{
          backgroundColor: theme.colors.primary,
          padding: 10,
          borderRadius: 8,
          marginBottom: 12,
        }}
      >
        <Text style={{ color: theme.colors.onPrimary, fontWeight: '500' }}>
          {viewAll ? 'View Active Only' : 'View All'}
        </Text>
      </TouchableOpacity>
      {alerts.map(a => (
        <View
          key={a.alert_id}
          style={{
            padding: 12,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
            borderRadius: 10,
            marginBottom: 10,
            backgroundColor: theme.colors.surface,
          }}
        >
          <Text style={{ fontWeight: '600' }}>{a.title || a.alert_type}</Text>
          <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            {a.description || a.message}
          </Text>
          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            <TouchableOpacity
              onPress={() => acknowledge(a.alert_id)}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 10,
                backgroundColor: theme.colors.secondary,
                borderRadius: 6,
                marginRight: 8,
              }}
            >
              <Text style={{ color: theme.colors.onSecondary, fontSize: 12 }}>Ack</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => resolve(a.alert_id)}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 10,
                backgroundColor: theme.colors.primary,
                borderRadius: 6,
              }}
            >
              <Text style={{ color: theme.colors.onPrimary, fontSize: 12 }}>Resolve</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      {loading && <ActivityIndicator style={{ marginTop: 20 }} />}
      {hasMore && !loading && (
        <TouchableOpacity
          onPress={loadMore}
          style={{
            backgroundColor: theme.colors.primary,
            padding: 12,
            borderRadius: 8,
            alignItems: 'center',
            marginTop: 8,
          }}
        >
          <Text style={{ color: theme.colors.onPrimary }}>Load More</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
