import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import useAlertsFeed from '../hooks/useAlertsFeed';
import { fetchLatestEodSummary } from '../../../api/eod';
import type { EodRunSummary } from '../../../interfaces/eod';

const formatStageLabel = (stage: string) => stage.replace(/_/g, ' ');

export default function AlertsFeedBasicMobile() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const [viewAll, setViewAll] = useState(false);
  const [eodSummary, setEodSummary] = useState<EodRunSummary | null>(null);
  const {
    alerts,
    loading,
    error,
    hasMore,
    loadMore,
    acknowledge,
    resolve,
    fix,
    isFixable,
    setFeedMode,
  } = useAlertsFeed();
  useEffect(() => {
    setFeedMode(viewAll ? 'all' : 'active');
  }, [viewAll]);

  useEffect(() => {
    let active = true;

    fetchLatestEodSummary()
      .then(summary => {
        if (active) {
          setEodSummary(summary);
        }
      })
      .catch(() => {
        if (active) {
          setEodSummary(null);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const statusColor =
    eodSummary?.status === 'success'
      ? theme.colors.primary
      : eodSummary?.status === 'partial'
        ? '#d9822b'
        : eodSummary?.status === 'failed'
          ? theme.colors.error
          : theme.colors.secondary;

  const navigateToReview = (target: {
    alertId?: number | null;
    ingredientId?: number | null;
    batchRecipeId?: number | null;
  }) => {
    navigation.navigate('inventory_table', {
      focusReview: {
        alertId: target.alertId ?? null,
        ingredientId: target.ingredientId ?? null,
        batchRecipeId: target.batchRecipeId ?? null,
      },
    });
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 12 }}>Alerts & Issues</Text>
      {eodSummary && (
        <View
          style={{
            padding: 12,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
            borderRadius: 10,
            marginBottom: 12,
            backgroundColor: theme.colors.surface,
          }}
        >
          <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
            Latest EOD Run
          </Text>
          <Text style={{ fontWeight: '600', marginBottom: 6 }}>{eodSummary.status_message}</Text>
          <Text style={{ fontSize: 12, color: statusColor, marginBottom: 6 }}>
            {eodSummary.status.toUpperCase()} · Forecast{' '}
            {eodSummary.forecast.forecast_status.toUpperCase()}
          </Text>
          <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}>
            {eodSummary.counts.open_discrepancy_count} open review ·{' '}
            {eodSummary.counts.purchase_order_suggestion_count} suggestions
          </Text>
          <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginTop: 6 }}>
            {eodSummary.forecast.forecast_status_message}
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
            {eodSummary.stages.map(stage => (
              <View
                key={stage.stage}
                style={{
                  borderWidth: 1,
                  borderColor: stage.completed ? theme.colors.primary : theme.colors.outlineVariant,
                  borderRadius: 999,
                  paddingVertical: 4,
                  paddingHorizontal: 8,
                  marginRight: 6,
                  marginBottom: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    color: stage.completed ? theme.colors.primary : theme.colors.onSurfaceVariant,
                  }}
                >
                  {formatStageLabel(stage.stage)}
                  {stage.duration_ms != null ? ` ${Math.round(stage.duration_ms / 1000)}s` : ''}
                </Text>
              </View>
            ))}
          </View>

          {eodSummary.errors.length > 0 && (
            <View style={{ marginTop: 8 }}>
              {eodSummary.errors.slice(0, 2).map(errorItem => (
                <Text
                  key={`${errorItem.stage}-${errorItem.ts ?? errorItem.message}`}
                  style={{ fontSize: 12, color: theme.colors.error, marginBottom: 4 }}
                >
                  {formatStageLabel(errorItem.stage)}: {errorItem.message}
                </Text>
              ))}
            </View>
          )}

          {eodSummary.repair_targets.length > 0 && (
            <View style={{ marginTop: 8 }}>
              {eodSummary.repair_targets.slice(0, 2).map(target => (
                <View
                  key={`${target.alert_id ?? 'no-alert'}-${target.ingredient_id ?? target.batch_recipe_id ?? target.item_name}`}
                  style={{ marginBottom: 8 }}
                >
                  <Text
                    style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginBottom: 4 }}
                  >
                    {target.item_name || 'Inventory item'}: {target.message}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      navigateToReview({
                        alertId: target.alert_id,
                        ingredientId: target.ingredient_id,
                        batchRecipeId: target.batch_recipe_id,
                      })
                    }
                    style={{
                      alignSelf: 'flex-start',
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                      backgroundColor: theme.colors.secondaryContainer,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ color: theme.colors.onSecondaryContainer, fontSize: 12 }}>
                      Review In Inventory
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            onPress={() => navigation.navigate('dashboard_eod-summary')}
            style={{
              alignSelf: 'flex-start',
              marginTop: 8,
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 6,
              borderWidth: 1,
              borderColor: theme.colors.outlineVariant,
            }}
          >
            <Text style={{ color: theme.colors.onSurface }}>Open Full EOD Detail</Text>
          </TouchableOpacity>
        </View>
      )}
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
                  Current: {Number((a.meta as any)?.current_quantity_on_hand ?? 0)}{' '}
                  {(a.meta as any)?.unit || ''} · Required:{' '}
                  {Number((a.meta as any)?.required_quantity ?? 0)} {(a.meta as any)?.unit || ''}
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
            {a.alert_type === 'Inventory:DeductionFailed' && (
              <TouchableOpacity
                onPress={() =>
                  navigateToReview({
                    alertId: a.alert_id,
                    ingredientId: (a.meta as any)?.ingredient_id ?? null,
                    batchRecipeId: (a.meta as any)?.batch_recipe_id ?? null,
                  })
                }
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  backgroundColor: theme.colors.secondaryContainer,
                  borderRadius: 6,
                  marginRight: 8,
                }}
              >
                <Text style={{ color: theme.colors.onSecondaryContainer, fontSize: 12 }}>
                  Review
                </Text>
              </TouchableOpacity>
            )}
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
                  fix(a.alert_id, {
                    quantity_sold: Number.isFinite(quantity) && quantity >= 0 ? quantity : 1,
                  });
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
