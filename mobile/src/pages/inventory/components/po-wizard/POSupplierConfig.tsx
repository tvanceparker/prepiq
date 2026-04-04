// src/pages/inventory/components/po-wizard/POSupplierConfig.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Button,
  Card,
  Chip,
  IconButton,
  ProgressBar,
  RadioButton,
  Text,
  useTheme,
} from 'react-native-paper';

const getProgressMeta = (useCachedForecast: boolean, progress: number): string => {
  const stages = useCachedForecast
    ? [
        { threshold: 0.25, label: 'Loading cached forecast snapshot' },
        { threshold: 0.65, label: 'Applying reorder rules' },
        { threshold: 1, label: 'Grouping supplier suggestions' },
      ]
    : [
        { threshold: 0.2, label: 'Running fresh forecast' },
        { threshold: 0.55, label: 'Breaking demand into ingredients' },
        { threshold: 0.85, label: 'Applying reorder rules' },
        { threshold: 1, label: 'Grouping supplier suggestions' },
      ];

  return stages.find(stage => progress <= stage.threshold)?.label ?? 'Finalizing suggestions';
};

interface POSupplierConfigProps {
  useCachedForecast: boolean;
  setUseCachedForecast: (value: boolean) => void;
  horizonDays: number;
  setHorizonDays: (value: number) => void;
  lastEodDate?: string;
  onGenerate: () => void;
  onGenerateFresh: () => void;
  isGenerating: boolean;
}

export default function POSupplierConfig({
  useCachedForecast,
  setUseCachedForecast,
  horizonDays,
  setHorizonDays,
  lastEodDate,
  onGenerate,
  onGenerateFresh,
  isGenerating,
}: POSupplierConfigProps): React.JSX.Element {
  const theme = useTheme();
  const [estimatedProgress, setEstimatedProgress] = React.useState(0);

  React.useEffect(() => {
    if (!isGenerating) {
      setEstimatedProgress(0);
      return;
    }

    const startedAt = Date.now();
    const durationMs = useCachedForecast ? 6000 : 18000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const ratio = Math.min(elapsed / durationMs, 0.92);
      setEstimatedProgress(ratio);
    }, 150);

    return () => clearInterval(interval);
  }, [isGenerating, useCachedForecast]);

  const progressLabel = React.useMemo(
    () => getProgressMeta(useCachedForecast, estimatedProgress),
    [estimatedProgress, useCachedForecast]
  );
  const progressPercent = Math.max(5, Math.round(estimatedProgress * 100));

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
        {isGenerating
          ? 'Generating...'
          : useCachedForecast
            ? 'Generate Cached Suggestions'
            : 'Generate Fresh Suggestions'}
      </Button>

      {useCachedForecast && (
        <Button
          mode="outlined"
          onPress={onGenerateFresh}
          disabled={isGenerating}
          style={styles.previewButton}
          icon="play-circle-outline"
        >
          Run Fresh Preview
        </Button>
      )}

      <Text
        variant="bodySmall"
        style={[styles.helperText, { color: theme.colors.onSurfaceVariant }]}
      >
        Generate Suggestions uses the forecast source selected above. Run Fresh Preview is a
        shortcut that switches to a live forecast and starts it immediately.
      </Text>

      {isGenerating && (
        <Card style={styles.progressCard} mode="outlined">
          <Card.Content>
            <View style={styles.progressHeader}>
              <Text variant="bodyMedium" style={styles.progressTitle}>
                {progressLabel}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {progressPercent}%
              </Text>
            </View>
            <ProgressBar
              progress={progressPercent / 100}
              color={theme.colors.primary}
              style={styles.progressBar}
            />
            <Text
              variant="bodySmall"
              style={[styles.progressCaption, { color: theme.colors.onSurfaceVariant }]}
            >
              Estimated progress only. If the request is interrupted, nothing is saved and you can
              rerun it safely.
            </Text>
          </Card.Content>
        </Card>
      )}
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
  previewButton: {
    marginTop: 12,
    borderRadius: 8,
  },
  helperText: {
    marginTop: 12,
    lineHeight: 18,
  },
  progressCard: {
    marginTop: 12,
    borderRadius: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 999,
  },
  progressCaption: {
    marginTop: 8,
  },
});
