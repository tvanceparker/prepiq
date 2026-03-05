import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useTheme } from 'react-native-paper';
import useAlertsFeed from '../hooks/useAlertsFeed';

export default function AlertsFeedBasicMobile() {
  const theme = useTheme();
  const [viewAll, setViewAll] = useState(false);
  const { alerts, loading, error, hasMore, loadMore, acknowledge, resolve, fix, isFixable, setFeedMode } =
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
          {a.alert_type === 'Inventory:DeductionFailed' && (
            <View style={{ marginTop: 6 }}>
              {(a.meta as any)?.ingredient_name && (
                <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}>
                  Ingredient: {(a.meta as any).ingredient_name}
                </Text>
              )}
              {((a.meta as any)?.current_quantity_on_hand !== undefined ||
                (a.meta as any)?.required_quantity !== undefined) && (
                <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}>
                  Current: {Number((a.meta as any)?.current_quantity_on_hand ?? 0)} {(a.meta as any)?.unit || ''} ·
                  Required: {Number((a.meta as any)?.required_quantity ?? 0)} {(a.meta as any)?.unit || ''}
                </Text>
              )}
              {(a.meta as any)?.deduction_reason && (
                <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}>
                  Reason: {(a.meta as any).deduction_reason}
                </Text>
              )}
              {(a.meta as any)?.attempted_day && (
                <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}>
                  Day: {(a.meta as any).attempted_day}
                </Text>
              )}
            </View>
          )}
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
                marginRight: isFixable(a) ? 8 : 0,
              }}
            >
              <Text style={{ color: theme.colors.onPrimary, fontSize: 12 }}>Resolve</Text>
            </TouchableOpacity>
            {isFixable(a) && (
              <TouchableOpacity
                onPress={() => {
                  if (a.alert_type === 'Inventory:DeductionFailed') {
                    const required = Number((a.meta as any)?.required_quantity ?? 0);
                    const available = Number((a.meta as any)?.available_quantity ?? 0);
                    const target = Number.isFinite(required) && required > 0 ? required : available;
                    fix(a.alert_id, { target_quantity_on_hand: Math.max(target, 0) });
                    return;
                  }

                  if (a.alert_type === 'DataQuality:MissingChannel') {
                    fix(a.alert_id, { sales_channel: 'unknown' });
                    return;
                  }

                  const quantity = Number((a.meta as any)?.required_quantity ?? 1);
                  fix(a.alert_id, { quantity_sold: Number.isFinite(quantity) && quantity >= 0 ? quantity : 1 });
                }}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  backgroundColor: theme.colors.tertiary,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: theme.colors.onTertiary, fontSize: 12 }}>Fix</Text>
              </TouchableOpacity>
            )}
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
