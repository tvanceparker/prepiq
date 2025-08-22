import React, { useState, useContext, useEffect } from 'react';
import { View } from 'react-native';
import { TextInput, Button, Card, Text, ActivityIndicator, useTheme } from 'react-native-paper';
import { AuthContext } from '../../contexts/AuthContext';
import { useLogin } from './hooks/useLogin';

export default function LoginScreen({ navigation }: any) {
  const theme = useTheme();
  const { token } = useContext(AuthContext);
  const { handleLogin, loading, error, setError } = useLogin();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (token) navigation.replace('dashboard_daily-overview');
  }, [token]);

  const onSubmit = () => handleLogin(username, password);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Card style={{ width: '100%', maxWidth: 400 }} mode="elevated">
        <Card.Title title="Login to PrepIQ" titleVariant="titleLarge" />
        <Card.Content>
          <TextInput
            label="Username"
            mode="outlined"
            autoCapitalize="none"
            value={username}
            onChangeText={t => {
              setUsername(t);
              if (error) setError('');
            }}
            style={{ marginBottom: 12 }}
            autoComplete="username"
          />
          <TextInput
            label="Password"
            mode="outlined"
            secureTextEntry
            value={password}
            onChangeText={t => {
              setPassword(t);
              if (error) setError('');
            }}
            style={{ marginBottom: 4 }}
            autoComplete="password"
          />
          {error ? (
            <Text style={{ color: theme.colors.error, marginBottom: 8 }}>{error}</Text>
          ) : null}
          <Button
            mode="contained"
            onPress={onSubmit}
            disabled={loading}
            style={{ marginTop: 8, paddingVertical: 4 }}
          >
            {loading ? <ActivityIndicator /> : 'Login'}
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
}
