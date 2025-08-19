import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function InfoSection({ title, children }: any) {
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginVertical: 8 },
  title: { fontWeight: '700', marginBottom: 6 },
});
