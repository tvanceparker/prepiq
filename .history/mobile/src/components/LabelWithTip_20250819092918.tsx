import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function LabelWithTip({ label, tip }: any) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      {tip ? <Text style={styles.tip}>{tip}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  label: { fontWeight: '600', marginRight: 8 },
  tip: { color: '#666', fontSize: 12 },
});
