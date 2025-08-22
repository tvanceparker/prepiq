import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

interface Props {
  label?: string;
  children: React.ReactNode;
  helperText?: string;
  inline?: boolean;
}
export default function FormRow({ label, children, helperText, inline }: Props) {
  return (
    <View style={[styles.container, inline && styles.inline]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.field}>{children}</View>
      {helperText && (
        <Text variant="bodySmall" style={styles.helper}>
          {helperText}
        </Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  inline: { flexDirection: 'row', alignItems: 'center' },
  label: { fontWeight: '600', marginBottom: 4, marginRight: 12 },
  field: { flex: 1 },
  helper: { color: '#666', marginTop: 4 },
});
