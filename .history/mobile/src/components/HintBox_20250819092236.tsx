import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function HintBox({ children }: any) {
  return (
    <View style={styles.box}>
      <Text style={styles.text}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: '#eef3ff', padding: 10, borderRadius: 6 },
  text: { color: '#1e3a8a' },
});
