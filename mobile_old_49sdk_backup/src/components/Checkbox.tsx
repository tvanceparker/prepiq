import React from 'react';
import { Checkbox as RPC } from 'react-native-paper';

export default function Checkbox({ status = 'unchecked', onPress }: any) {
  return <RPC status={status} onPress={onPress} />;
}
