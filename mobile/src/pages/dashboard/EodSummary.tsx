import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

import { fetchLatestEodSummary } from '../../api/eod';
import type { EodRunSummary } from '../../interfaces/eod';

const formatStageLabel = (stage: string) => stage.replace(/_/g, ' ');

export default function EodSummary() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const [summary, setSummary] = useState<EodRunSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetchLatestEodSummary()
      .then(data => {
        if (!active) {
          return;
        }
        setSummary(data);
        setError(null);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setError('Failed to load EOD summary.');
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Text style={{ fontSize: 24, fontWeight: '700', marginBottom: 12 }}>EOD Detail</Text>

      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        <TouchableOpacity
          onPress={() => navigation.navigate('dashboard_alerts')}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
            marginRight: 8,
          }}
        >
          <Text>Back To Alerts</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator style={{ marginTop: 24 }} />}
      {error && <Text style={{ color: theme.colors.error }}>{error}</Text>}

      {summary && (
        <>
          <View
            style={{
              padding: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.colors.outlineVariant,
              backgroundColor: theme.colors.surface,
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
              Latest Run
            </Text>
            <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 6 }}>
              {summary.status_message}
            </Text>
            <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}>
              Run date {summary.run_date}
            </Text>
            <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
              Forecast {summary.forecast.forecast_status.toUpperCase()} ·{' '}
              {summary.counts.open_discrepancy_count} open review
            </Text>
          </View>

          <View
            style={{
              padding: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.colors.outlineVariant,
              backgroundColor: theme.colors.surface,
              marginBottom: 12,
            }}
          >
            <Text style={{ fontWeight: '700', marginBottom: 8 }}>Stage Status</Text>
            {summary.stages.map(stage => (
              <Text
                key={stage.stage}
                style={{ marginBottom: 6, color: theme.colors.onSurfaceVariant }}
              >
                {formatStageLabel(stage.stage)}: {stage.completed ? 'Completed' : 'Pending'}
                {stage.duration_ms != null ? ` · ${Math.round(stage.duration_ms / 1000)}s` : ''}
              </Text>
            ))}
          </View>

          <View
            style={{
              padding: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.colors.outlineVariant,
              backgroundColor: theme.colors.surface,
              marginBottom: 12,
            }}
          >
            <Text style={{ fontWeight: '700', marginBottom: 8 }}>Errors And Warnings</Text>
            {summary.errors.length === 0 ? (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                No recorded EOD errors for this run.
              </Text>
            ) : (
              summary.errors.map(errorItem => (
                <View
                  key={`${errorItem.stage}-${errorItem.ts ?? errorItem.message}`}
                  style={{ marginBottom: 8 }}
                >
                  <Text style={{ color: theme.colors.error, fontWeight: '600' }}>
                    {formatStageLabel(errorItem.stage)}
                  </Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>{errorItem.message}</Text>
                </View>
              ))
            )}
          </View>

          <View
            style={{
              padding: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.colors.outlineVariant,
              backgroundColor: theme.colors.surface,
            }}
          >
            <Text style={{ fontWeight: '700', marginBottom: 8 }}>Repair Targets</Text>
            {summary.repair_targets.length === 0 ? (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                No open inventory repair targets for this run.
              </Text>
            ) : (
              summary.repair_targets.map(target => (
                <View
                  key={`${target.alert_id ?? 'no-alert'}-${target.ingredient_id ?? target.batch_recipe_id ?? target.item_name}`}
                  style={{ marginBottom: 10 }}
                >
                  <Text style={{ fontWeight: '600' }}>{target.item_name || 'Inventory item'}</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
                    {target.message}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate('inventory_table', {
                        focusReview: {
                          alertId: target.alert_id,
                          ingredientId: target.ingredient_id,
                          batchRecipeId: target.batch_recipe_id,
                        },
                      })
                    }
                    style={{
                      alignSelf: 'flex-start',
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                      borderRadius: 6,
                      backgroundColor: theme.colors.secondaryContainer,
                    }}
                  >
                    <Text style={{ color: theme.colors.onSecondaryContainer }}>
                      Review In Inventory
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}
