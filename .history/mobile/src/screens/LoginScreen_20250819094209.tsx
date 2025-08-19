import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, TextInput, Title } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import client from '../api/client';
import { AuthContext } from '../contexts/AuthContext';

type FormValues = { username: string; password: string };

const schema = yup.object({
  username: yup.string().required(),
  password: yup.string().required(),
});

export default function LoginScreen({ navigation }: any) {
  const { login } = React.useContext(AuthContext);
  const { control, handleSubmit } = useForm<FormValues>({ resolver: yupResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    try {
      const form = new FormData();
      form.append('username', data.username);
      form.append('password', data.password);
      const res = await client.post('/api/v1/auth/login', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      await login({
        token: res.data.access_token,
        tier: res.data.subscription_tier,
        user: { name: res.data.name, role_id: res.data.role_id, user_id: res.data.employee_id },
        preferences: res.data.preferences || { theme: 'light', auto_logout_minutes: 30 }
      });
      navigation.replace('MainTabs');
    } catch (err) {
      console.warn(err);
    }
  };

  return (
    <View style={styles.container}>
      <Title style={{ marginBottom: 16 }}>Sign in</Title>
      <Controller
        control={control}
        name="username"
        render={({ field: { onChange, value } }) => (
          <TextInput label="Username" value={value} onChangeText={onChange} style={styles.input} />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value } }) => (
          <TextInput label="Password" value={value} secureTextEntry onChangeText={onChange} style={styles.input} />
        )}
      />
      <Button mode="contained" onPress={handleSubmit(onSubmit)} style={styles.button}>
        Sign in
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  input: { marginBottom: 12 },
  button: { marginTop: 8 },
});
