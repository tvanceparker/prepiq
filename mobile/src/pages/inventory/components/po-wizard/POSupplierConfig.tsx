// src/pages/inventory/components/po-wizard/POSupplierConfig.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Card, Chip, IconButton, RadioButton, Text, useTheme } from 'react-native-paper';

interface POSupplierConfigProps {
  useCachedForecast: boolean;
  setUseCachedForecast: (value: boolean) => void;
  horizonDays: number;
  setHorizonDays: (value: number) => void;
  lastEodDate?: string;
  onGenerate: () => void;
  isGenerating: boolean;
}

export default function POSupplierConfig({
  useCachedForecast,
  setUseCachedForecast,
  horizonDays,
  setHorizonDays,
  lastEodDate,
  onGenerate,
  isGenerating,
}: POSupplierConfigProps): React.JSX.Element {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.title}>
        Configure Forecast
      </Text>

      <Card style={styles.configCard} mode="outlined">
        <Card.Content>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            Forecast Source
          </Text>
          <RadioButton.Group
            value={useCachedForecast ? 'cached' : 'fresh'}
            onValueChange={v => setUseCachedForecast(v === 'cached')}
          >
            <View style={styles.radioOption}>
              <RadioButton value="cached" />
              <View style={styles.radioContent}>
                <Text variant="bodyMedium" style={styles.radioTitle}>
                  Use Last EOD Forecast
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Faster •{' '}
                  {lastEodDate
                    ? `Last: ${new Date(lastEodDate).toLocaleDateString()}`
                    : 'Available'}
                </Text>
              </View>
            </View>
            <View style={styles.radioOption}>
              <RadioButton value="fresh" />
              <View style={styles.radioContent}>
                <Text variant="bodyMedium" style={styles.radioTitle}>
                  Generate Fresh Forecast
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  More accurate • Takes longer
                </Text>
              </View>
            </View>
          </RadioButton.Group>
        </Card.Content>
      </Card>

      <Card style={[styles.configCard, { marginTop: 12 }]} mode="outlined">
        <Card.Content>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            Planning Horizon
          </Text>
          <View style={styles.horizonRow}>
            <IconButton
              icon="minus"
              mode="contained"
              size={20}
              onPress={() => setHorizonDays(Math.max(1, horizonDays - 1))}
              disabled={horizonDays <= 1}
            />
            <Chip mode="outlined" style={styles.horizonChip}>
              <Text variant="titleMedium" style={{ fontWeight: '700' }}>
                {horizonDays}
              </Text>
              <Text variant="bodySmall"> days</Text>
            </Chip>
            <IconButton
              icon="plus"
              mode="contained"
              size={20}
              onPress={() => setHorizonDays(Math.min(14, horizonDays + 1))}
              disabled={horizonDays >= 14}
            />
          </View>
          <View style={styles.sliderLabels}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Min: 1 day
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Max: 14 days
            </Text>
          </View>
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={onGenerate}
        loading={isGenerating}
        disabled={isGenerating}
        style={styles.generateButton}
        icon="auto-fix"
      >
        {isGenerating ? 'Generating...' : 'Generate Suggestions'}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontWeight: '600',
    marginBottom: 16,
  },
  configCard: {
    borderRadius: 12,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  radioContent: {
    flex: 1,
  },
  radioTitle: {
    fontWeight: '500',
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  horizonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 8,
  },
  horizonChip: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  generateButton: {
    marginTop: 24,
    paddingVertical: 8,
    borderRadius: 8,
  },
});
