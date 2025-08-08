import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Surface, IconButton, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../constants/theme';

interface ScreenLayoutProps {
  title: string;
  subtitle?: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor?: string;
  children: React.ReactNode;
  rightAction?: React.ReactNode;
  scrollable?: boolean;
}

export default function ScreenLayout({
  title,
  subtitle,
  icon,
  iconColor = Colors.primary,
  children,
  rightAction,
  scrollable = true,
}: ScreenLayoutProps) {
  const theme = useTheme();

  const content = (
    <View style={styles.content}>
      {/* Header */}
      <Surface style={[styles.header, Shadows.small]}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons 
            name={icon} 
            size={32} 
            color={iconColor} 
            style={styles.headerIcon}
          />
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: theme.colors.onSurface }]}>
              {title}
            </Text>
            {subtitle && (
              <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>
        {rightAction && (
          <View style={styles.headerRight}>
            {rightAction}
          </View>
        )}
      </Surface>

      {/* Content */}
      <View style={styles.body}>
        {children}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {scrollable ? (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    marginLeft: Spacing.md,
  },
  headerIcon: {
    marginRight: Spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...Typography.h3,
    fontWeight: 'bold',
  },
  subtitle: {
    ...Typography.body2,
    marginTop: Spacing.xs,
  },
  body: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
});