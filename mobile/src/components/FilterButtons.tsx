import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';

interface Option {
  label: string;
  value: string;
}
interface Props {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
}
export default function FilterButtons({ options, value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {options.map(opt => (
        <Button
          key={opt.value}
          mode={opt.value === value ? 'contained' : 'outlined'}
          style={styles.btn}
          onPress={() => onChange(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: { marginRight: 8, marginBottom: 8 },
});
