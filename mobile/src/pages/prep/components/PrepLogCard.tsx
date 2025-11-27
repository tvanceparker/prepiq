// src/pages/prep/components/PrepLogCard.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Chip, useTheme, Divider } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { PrepLog } from '../../../interfaces/prep';

interface PrepLogCardProps {
  log: PrepLog;
  getStatusColor: (status: string) => string;
  getStatusBgColor: (status: string) => string;
  getExpiryStatus: (expiryDate: string | null) => { label: string; color: string } | null;
  formatDate: (dateStr: string | null | undefined) => string;
}

export function PrepLogCard({
  log,
  getStatusColor,
  getStatusBgColor,
  getExpiryStatus,
  formatDate,
}: PrepLogCardProps): React.JSX.Element {
  const theme = useTheme();
  const expiryStatus = getExpiryStatus(log.expiry_date);
  const statusColor = getStatusColor(log.status);
  const statusBgColor = getStatusBgColor(log.status);

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content>
        {/* Header row */}
        <View style={styles.headerRow}>
          <View style={styles.titleSection}>
            <Text variant="titleMedium" style={styles.recipeName}>
              {log.batch_recipe_name || 'Unknown Recipe'}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {formatDate(log.prep_date)}
            </Text>
          </View>
          <Chip
            compact
            style={[styles.statusChip, { backgroundColor: statusBgColor }]}
            textStyle={{ color: statusColor, fontSize: 11, fontWeight: '600' }}
          >
            {log.status?.replace('_', ' ').toUpperCase()}
          </Chip>
        </View>

        <Divider style={styles.divider} />

        {/* Quantity row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons
              name="target"
              size={16}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="bodySmall" style={styles.statLabel}>
              Needed
            </Text>
            <Text variant="titleSmall" style={styles.statValue}>
              {Number(log.quantity_needed || 0).toFixed(1)}
            </Text>
          </View>

          <View style={styles.statItem}>
            <MaterialCommunityIcons
              name="check-circle"
              size={16}
              color={log.quantity_prepped ? '#4caf50' : theme.colors.onSurfaceVariant}
            />
            <Text variant="bodySmall" style={styles.statLabel}>
              Prepped
            </Text>
            <Text
              variant="titleSmall"
              style={[
                styles.statValue,
                log.quantity_prepped != null && log.quantity_prepped > 0 && { color: '#4caf50' },
              ]}
            >
              {log.quantity_prepped ? Number(log.quantity_prepped).toFixed(1) : '-'}
            </Text>
          </View>

          <View style={styles.statItem}>
            <MaterialCommunityIcons
              name="layers-triple"
              size={16}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="bodySmall" style={styles.statLabel}>
              Batches
            </Text>
            <Text variant="titleSmall" style={styles.statValue}>
              {log.prep_batch_count ? Number(log.prep_batch_count).toFixed(1) : '-'}
            </Text>
          </View>
        </View>

        {/* Time row */}
        <View style={styles.timeRow}>
          <View style={styles.timeItem}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={14}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Est: {log.prep_time_minutes_estimated ? `${log.prep_time_minutes_estimated} min` : '-'}
            </Text>
          </View>
          <View style={styles.timeItem}>
            <MaterialCommunityIcons
              name="clock-check-outline"
              size={14}
              color={log.prep_time_minutes_actual ? '#4caf50' : theme.colors.onSurfaceVariant}
            />
            <Text
              variant="bodySmall"
              style={{
                color: log.prep_time_minutes_actual ? '#4caf50' : theme.colors.onSurfaceVariant,
              }}
            >
              Actual: {log.prep_time_minutes_actual ? `${log.prep_time_minutes_actual} min` : '-'}
            </Text>
          </View>
        </View>

        {/* Footer row */}
        <View style={styles.footerRow}>
          {log.assigned_employee_name && (
            <View style={styles.employeeInfo}>
              <MaterialCommunityIcons
                name="account"
                size={14}
                color={theme.colors.onSurfaceVariant}
              />
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}
              >
                {log.assigned_employee_name}
              </Text>
            </View>
          )}

          {expiryStatus && (
            <View style={[styles.expiryBadge, { backgroundColor: `${expiryStatus.color}15` }]}>
              <MaterialCommunityIcons
                name="calendar-clock"
                size={14}
                color={expiryStatus.color}
              />
              <Text
                variant="labelSmall"
                style={{ color: expiryStatus.color, marginLeft: 4, fontWeight: '600' }}
              >
                {expiryStatus.label}
              </Text>
            </View>
          )}
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleSection: {
    flex: 1,
    marginRight: 8,
  },
  recipeName: {
    fontWeight: '600',
    marginBottom: 2,
  },
  statusChip: {
    height: 24,
  },
  divider: {
    marginVertical: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 70,
  },
  statLabel: {
    color: '#757575',
    marginTop: 4,
    fontSize: 11,
  },
  statValue: {
    fontWeight: '600',
    marginTop: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 12,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
});

export default PrepLogCard;
