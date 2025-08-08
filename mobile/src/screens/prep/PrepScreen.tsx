import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, Button, useTheme } from 'react-native-paper';
import ScreenLayout from '../../components/ScreenLayout';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';

export default function PrepScreen() {
  const theme = useTheme();

  return (
    <ScreenLayout
      title="Prep Schedule"
      subtitle="Manage your prep tasks and schedules"
      icon="chef-hat"
      iconColor={Colors.prep}
    >
      <Card style={[styles.card, Shadows.medium]}>
        <Card.Content style={styles.cardContent}>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>
            Prep Management
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            This feature will include prep scheduling, batch tracking, and task management.
          </Text>
          <Button
            mode="contained"
            style={styles.button}
            onPress={() => {}}
          >
            View Prep Schedule
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