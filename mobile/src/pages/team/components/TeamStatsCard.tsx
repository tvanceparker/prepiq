// src/pages/team/components/TeamStatsCard.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface StatItem {
  label: string;
  value: string | number;
  icon?: IconName;
  color?: string;
}

interface TeamStatsCardProps {
  title?: string;
  stats: StatItem[];
  columns?: 2 | 3 | 4;
}

export function TeamStatsCard({
  title,
  stats,
  columns = 3,
}: TeamStatsCardProps): React.JSX.Element {
  const theme = useTheme();

  return (
    <Card style={styles.card} mode="outlined">
      {title && (
        <Card.Title
          title={title}
          titleVariant="titleMedium"
          titleStyle={{ fontWeight: '600' }}
        />
      )}
      <Card.Content>
        <View style={[styles.statsRow, { flexWrap: 'wrap' }]}>
          {stats.map((stat, index) => (
            <View
              key={index}
              style={[
                styles.statItem,
                { width: `${100 / columns}%` },
              ]}
            >
              {stat.icon && (
                <MaterialCommunityIcons
                  name={stat.icon}
                  size={20}
                  color={stat.color || theme.colors.primary}
                  style={styles.statIcon}
                />
              )}
              <Text
                variant="headlineSmall"
                style={[styles.statValue, { color: stat.color || theme.colors.onSurface }]}
              >
                {stat.value}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
  statItem: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  statIcon: {
    marginBottom: 4,
  },
  statValue: {
    fontWeight: '700',
    textAlign: 'center',
  },
  statLabel: {
    color: '#757575',
    marginTop: 2,
    textAlign: 'center',
  },
});

export default TeamStatsCard;
