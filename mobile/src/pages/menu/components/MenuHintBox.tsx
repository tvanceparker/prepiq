// src/pages/menu/components/MenuHintBox.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, useTheme, Avatar } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

interface MenuHintBoxProps {
  onNavigateToRecipes?: () => void;
}

export default function MenuHintBox({ onNavigateToRecipes }: MenuHintBoxProps) {
  const theme = useTheme();

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content style={styles.content}>
        <View style={styles.iconContainer}>
          <Avatar.Icon
            size={44}
            icon="lightbulb-on"
            style={{ backgroundColor: '#fff3e0' }}
            color="#f57c00"
          />
        </View>
        <Text variant="titleSmall" style={styles.title}>
          Need a Recipe First?
        </Text>
        <Text
          variant="bodySmall"
          style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
        >
          🧠 Before creating a menu item, make sure you've added your recipe using the{' '}
          <Text style={{ fontWeight: '700' }}>Recipe Editor</Text>. You'll link it here when
          building your menu item.
        </Text>
        {onNavigateToRecipes && (
          <TouchableOpacity onPress={onNavigateToRecipes} style={styles.linkContainer}>
            <Text style={[styles.link, { color: theme.colors.primary }]}>Go to Recipe Editor</Text>
            <MaterialCommunityIcons name="arrow-right" size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderColor: '#ffcc80',
    backgroundColor: '#fffaf0',
  },
  content: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  iconContainer: {
    marginBottom: 12,
  },
  title: {
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 4,
  },
  link: {
    fontWeight: '600',
  },
});
