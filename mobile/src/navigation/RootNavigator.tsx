import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../pages/auth/LoginScreen';
import { AuthContext } from '../contexts/AuthContext';
import { ActivityIndicator } from 'react-native-paper';
import { View } from 'react-native';
import { AppRoutes } from './routes';
import AssistantOverlay from '../components/assistant/AssistantOverlay';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { token, loading } = React.useContext(AuthContext);
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token ? (
          <Stack.Screen name="App" component={AppRoutes} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
      {token ? <AssistantOverlay /> : null}
    </>
  );
}
