// src/pages/team/components/PerformerCard.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Chip, Avatar, useTheme, ProgressBar } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { EmployeePerformance } from '../../../interfaces/team';

interface PerformerCardProps {
  performer: EmployeePerformance;
  rank?: number;
}

export function PerformerCard({ performer, rank }: PerformerCardProps): React.JSX.Element {
  const theme = useTheme();

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    const first = parts[0]?.[0] || '';
    const last = parts[1]?.[0] || '';
    return (first + last).toUpperCase() || '??';
  };

  const getRankColor = (r?: number) => {
    switch (r) {
      case 1:
        return '#ffd700'; // Gold
      case 2:
        return '#c0c0c0'; // Silver
      case 3:
        return '#cd7f32'; // Bronze
      default:
        return theme.colors.primary;
    }
  };

  const onTimeRate = performer.on_time_percentage || 0;

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content style={styles.content}>
        <View style={styles.headerRow}>
          {rank && (
            <View style={[styles.rankBadge, { backgroundColor: getRankColor(rank) }]}>
              <Text variant="labelSmall" style={styles.rankText}>
                #{rank}
              </Text>
            </View>
          )}
          <Avatar.Text
            size={40}
            label={getInitials(performer.employee_name)}
            style={{ backgroundColor: theme.colors.primary }}
          />
          <View style={styles.nameSection}>
            <Text variant="titleMedium" style={styles.name}>
              {performer.employee_name}
            </Text>
            {performer.role && (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {performer.role}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="clock-outline" size={16} color={theme.colors.primary} />
            <Text variant="titleSmall" style={styles.statValue}>
              {performer.total_hours.toFixed(1)}h
            </Text>
            <Text variant="labelSmall" style={styles.statLabel}>
              Hours
            </Text>
          </View>

          <View style={styles.statItem}>
            <MaterialCommunityIcons
              name="calendar-check"
              size={16}
              color={theme.colors.secondary}
            />
            <Text variant="titleSmall" style={styles.statValue}>
              {performer.total_shifts}
            </Text>
            <Text variant="labelSmall" style={styles.statLabel}>
              Shifts
            </Text>
          </View>

          <View style={styles.statItem}>
            <MaterialCommunityIcons name="timer-outline" size={16} color={theme.colors.tertiary} />
            <Text variant="titleSmall" style={styles.statValue}>
              {performer.avg_shift_duration.toFixed(1)}h
            </Text>
            <Text variant="labelSmall" style={styles.statLabel}>
              Avg/Shift
            </Text>
          </View>
        </View>

        <View style={styles.onTimeSection}>
          <View style={styles.onTimeHeader}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              On-Time Rate
            </Text>
            <Chip
              compact
              style={[
                styles.rateChip,
                {
                  backgroundColor:
                    onTimeRate >= 90 ? '#e8f5e9' : onTimeRate >= 70 ? '#fff8e1' : '#ffebee',
                },
              ]}
              textStyle={{
                fontSize: 10,
                color: onTimeRate >= 90 ? '#4caf50' : onTimeRate >= 70 ? '#ff9800' : '#f44336',
              }}
            >
              {onTimeRate.toFixed(0)}%
            </Chip>
          </View>
          <ProgressBar
            progress={onTimeRate / 100}
            color={onTimeRate >= 90 ? '#4caf50' : onTimeRate >= 70 ? '#ff9800' : '#f44336'}
            style={styles.progressBar}
          />
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  content: {
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    color: '#fff',
    fontWeight: '700',
  },
  nameSection: {
    flex: 1,
  },
  name: {
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontWeight: '600',
  },
  statLabel: {
    color: '#757575',
  },
  onTimeSection: {
    gap: 4,
  },
  onTimeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rateChip: {
    height: 20,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
});

export default PerformerCard;
