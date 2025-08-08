import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, Button, useTheme } from 'react-native-paper';
import ScreenLayout from '../../components/ScreenLayout';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';

export default function AnalyticsScreen() {
  const theme = useTheme();

  return (
    <ScreenLayout
      title="Analytics & Insights"
      subtitle="Business intelligence and reporting"
      icon="chart-bar"
      iconColor={Colors.analytics}
    >
      <Card style={[styles.card, Shadows.medium]}>
        <Card.Content style={styles.cardContent}>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>
            Business Analytics
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            This feature will include profitability analysis, ingredient trends, waste tracking, and performance insights.
          </Text>
          <Button
            mode="contained"
            style={styles.button}
            onPress={() => {}}
          >
            View Analytics Dashboard
          </Button>
        </Card.Content>
      </Card>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.md,
  },
  cardContent: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  title: {
    ...Typography.h3,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.body1,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  button: {
    marginTop: Spacing.md,
  },
});