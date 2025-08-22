import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useApp } from '../state/AppContext';

export default function HomeScreen({ navigation }: any) {
  const { token, setToken } = useApp();
  return (
    <View style={styles.container}>
      <Text>Welcome to Prepiq Mobile</Text>
      <Text>Token: {token ? 'set' : 'not set'}</Text>
      <Button
        onPress={() => {
          setToken(null);
          navigation.replace('Login');
        }}
        style={{ marginTop: 12 }}
      >
        Sign out
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
