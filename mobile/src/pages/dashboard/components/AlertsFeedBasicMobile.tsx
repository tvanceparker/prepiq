import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import useAlertsFeed from '../hooks/useAlertsFeed';
import { fetchLatestEodSummary } from '../../../api/eod';
import type { EodRunSummary } from '../../../interfaces/eod';

const formatStageLabel = (stage: string) => stage.replace(/_/g, ' ');
const highSignalAlertTypes = new Set([
  'MissingSalesData',
  'Inventory:DeductionFailed',
  'prep_incomplete',
]);

const getSeverityRank = (severity: string) => {
  switch (severity) {
    case 'urgent':
      return 4;
    case 'error':
      return 3;
    case 'warning':
      return 2;
    default:
      return 1;
  }
};

const isHighSignalAlert = (alert: { alert_type: string; severity: string }) =>
  highSignalAlertTypes.has(alert.alert_type) || getSeverityRank(alert.severity) >= 3;

export default function AlertsFeedBasicMobile() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const [viewAll, setViewAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [feedFilter, setFeedFilter] = useState<'priority' | 'all' | 'inventory' | 'fixable'>(
    'priority'
  );
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

  const sortedAlerts = useMemo(() => {
    return [...alerts].sort((left, right) => {
      const highSignalDelta = Number(isHighSignalAlert(right)) - Number(isHighSignalAlert(left));
      if (highSignalDelta !== 0) return highSignalDelta;

      const severityDelta = getSeverityRank(right.severity) - getSeverityRank(left.severity);
      if (severityDelta !== 0) return severityDelta;

      const leftPriority = isFixable(left) ? 1 : 0;
      const rightPriority = isFixable(right) ? 1 : 0;
      if (rightPriority !== leftPriority) return rightPriority - leftPriority;

      return Number(left.is_acknowledged) - Number(right.is_acknowledged);
    });
  }, [alerts, isFixable]);

  const filteredAlerts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return sortedAlerts.filter(alert => {
      if (feedFilter === 'priority') {
        const isPriority = isHighSignalAlert(alert);
        if (!isPriority) return false;
      }

      if (feedFilter === 'inventory' && !alert.alert_type.startsWith('Inventory:')) return false;
      if (feedFilter === 'fixable' && !isFixable(alert)) return false;

      if (!search) return true;

      const haystack = [
        alert.title,
        alert.alert_type,
        alert.message,
        JSON.stringify(alert.meta ?? {}),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [feedFilter, isFixable, searchTerm, sortedAlerts]);

  const trustCount = alerts.filter(alert => isHighSignalAlert(alert)).length;
  const fixableCount = alerts.filter(alert => isFixable(alert)).length;
  const inventoryCount = alerts.filter(alert => alert.alert_type.startsWith('Inventory:')).length;
  const groupedSections = useMemo(() => {
    const sections: Array<{
      key: string;
      title: string;
      subtitle: string;
      alerts: typeof filteredAlerts;
    }> = [];
    const usedIds = new Set<string | number>();

    const takeSection = (
      key: string,
      title: string,
      subtitle: string,
      predicate: (alert: (typeof filteredAlerts)[number]) => boolean
    ) => {
      const sectionAlerts = filteredAlerts.filter(
        alert => !usedIds.has(alert.alert_id) && predicate(alert)
      );
      sectionAlerts.forEach(alert => usedIds.add(alert.alert_id));
      if (sectionAlerts.length > 0) {
        sections.push({ key, title, subtitle, alerts: sectionAlerts });
      }
    };

    takeSection(
      'trust',
      'Trust Blockers',
      'Alerts most likely to change whether you can trust EOD, forecast, or inventory outputs.',
      alert => isHighSignalAlert(alert)
    );
    takeSection(
      'repair',
      'Fix Now',
      'Records you can correct immediately to reduce queue noise and restore trust faster.',
      alert => !isHighSignalAlert(alert) && isFixable(alert)
    );
    takeSection(
      'inventory',
      'Inventory Watch',
      'Stock issues that impact trust and recovery.',
      alert => alert.alert_type.startsWith('Inventory:')
    );
    takeSection(
      'operations',
      'Operations',
      'Lower-noise items that still need attention.',
      () => true
    );

    return sections;
  }, [filteredAlerts, isFixable]);

  const renderAlertCard = (a: (typeof filteredAlerts)[number]) => (
    <View
      key={a.alert_id}
      style={{
        padding: 12,
        borderWidth: 1,
        borderColor:
          getSeverityRank(a.severity) >= 3
            ? theme.colors.error
            : a.alert_type.startsWith('Inventory:')
              ? '#d9822b'
              : theme.colors.outlineVariant,
        borderRadius: 10,
        marginBottom: 10,
        backgroundColor: theme.colors.surface,
      }}
    >
      <Text style={{ fontWeight: '600' }}>{a.title || a.alert_type}</Text>
      <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
        {a.alert_type}
      </Text>
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
              {a.action_label || 'Review Inventory'}
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
          <Text style={{ color: theme.colors.onSecondary, fontSize: 12 }}>Seen</Text>
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
          <Text style={{ color: theme.colors.onPrimary, fontSize: 12 }}>Close</Text>
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
            <Text style={{ color: theme.colors.onTertiary, fontSize: 12 }}>
              {a.alert_type === 'DataQuality:MissingChannel'
                ? 'Set Channel'
                : a.alert_type === 'Inventory:DeductionFailed'
                  ? 'Adjust Qty'
                  : 'Fix Now'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
      <View
        style={{
          padding: 16,
          borderRadius: 16,
          marginBottom: 12,
          backgroundColor: '#20453d',
        }}
      >
        <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', marginBottom: 6 }}>
          Operator Queue
        </Text>
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 8 }}>
          Alerts & Issues
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.84)', marginBottom: 12 }}>
          Work the highest-signal alerts first, keep inventory repairs close, and leave the
          low-noise items for later.
        </Text>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ marginRight: 20 }}>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Trust</Text>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>{trustCount}</Text>
          </View>
          <View>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Fix Now</Text>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>{fixableCount}</Text>
          </View>
        </View>
      </View>

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
          <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginBottom: 6 }}>
            {eodSummary.is_historical ? 'Historical review' : 'Latest finalized run'}
          </Text>
          <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}>
            {eodSummary.counts.open_discrepancy_count} open review ·{' '}
            {eodSummary.counts.purchase_order_suggestion_count} suggestions ·{' '}
            {eodSummary.counts.purchase_orders_created} draft POs
          </Text>
          <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginTop: 6 }}>
            {eodSummary.forecast.forecast_status_message}
          </Text>
          <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginTop: 6 }}>
            {eodSummary.downstream.message}
          </Text>
          {eodSummary.guidance.steps[0] && (
            <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginTop: 6 }}>
              Next step: {eodSummary.guidance.steps[0]}
            </Text>
          )}

          <View style={{ marginTop: 8 }}>
            <Text style={{ fontWeight: '600', marginBottom: 4 }}>
              {eodSummary.guidance.headline}
            </Text>
            {eodSummary.guidance.steps.slice(0, 3).map(step => (
              <Text
                key={step}
                style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginBottom: 4 }}
              >
                • {step}
              </Text>
            ))}
          </View>

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

      <View
        style={{
          padding: 12,
          borderWidth: 1,
          borderColor: theme.colors.outlineVariant,
          borderRadius: 12,
          marginBottom: 12,
          backgroundColor: theme.colors.surface,
        }}
      >
        <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
          Filter Queue
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
          {[
            ['priority', `Trust · ${trustCount}`],
            ['inventory', `Inventory · ${inventoryCount}`],
            ['fixable', `Fix Now · ${fixableCount}`],
            ['all', `All · ${alerts.length}`],
          ].map(([key, label]) => {
            const active = feedFilter === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setFeedFilter(key as any)}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 999,
                  marginRight: 8,
                  marginBottom: 8,
                  backgroundColor: active ? theme.colors.primary : theme.colors.surfaceVariant,
                }}
              >
                <Text
                  style={{
                    color: active ? theme.colors.onPrimary : theme.colors.onSurfaceVariant,
                    fontSize: 12,
                  }}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TextInput
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder="Search alerts, ingredients, or metadata"
          placeholderTextColor={theme.colors.onSurfaceVariant}
          style={{
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: theme.colors.onSurface,
          }}
        />
      </View>

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

      {filteredAlerts.length > 0 && (
        <View style={{ marginBottom: 10 }}>
          <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}>
            {filteredAlerts.length} alerts match the current queue.
          </Text>
        </View>
      )}

      {groupedSections.map(section => (
        <View key={section.key} style={{ marginBottom: 10 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 4 }}>{section.title}</Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 10 }}>
            {section.subtitle}
          </Text>
          {section.alerts.map(renderAlertCard)}
        </View>
      ))}

      {!loading && filteredAlerts.length === 0 && (
        <View
          style={{
            padding: 18,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
            borderRadius: 12,
            backgroundColor: theme.colors.surface,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontWeight: '700', marginBottom: 6 }}>Nothing matches this view.</Text>
          <Text
            style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginBottom: 10 }}
          >
            Clear the search or switch the queue filter to bring more alerts back into view.
          </Text>
          <TouchableOpacity
            onPress={() => {
              setSearchTerm('');
              setFeedFilter('all');
            }}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 8,
              backgroundColor: theme.colors.secondaryContainer,
            }}
          >
            <Text style={{ color: theme.colors.onSecondaryContainer }}>Reset Filters</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && <ActivityIndicator style={{ marginTop: 20 }} />}
      {hasMore && !loading && filteredAlerts.length > 0 && (
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
