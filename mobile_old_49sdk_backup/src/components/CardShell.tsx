import React from 'react';
import { Surface, Text } from 'react-native-paper';
import { StyleSheet, View } from 'react-native';

export default function CardShell({ title, children }: any) {
  return (
    <Surface style={styles.card}>
      {title ? <Text variant="titleMedium">{title}</Text> : null}
      <View style={styles.content}>{children}</View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, margin: 8, elevation: 2 },
  content: { marginTop: 8 },
});
