import { BASE_URL } from './config';
import { post } from './index';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const login = async (username: string, password: string) => {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Login failed: ${res.status} ${errText}`);
  }

  const data = await res.json();
  if (data.access_token) {
    await AsyncStorage.setItem('token', data.access_token);
  }

  return {
    access_token: data.access_token,
    restaurant_id: data.restaurant_id,
    subscription_tier: data.subscription_tier,
    name: data.name,
    employee_id: data.employee_id,
    role_id: data.role_id,
    preferences: data.preferences || {},
  };
};

export const getRolesWithPermissions = async () => get('/admin/roles-with-permissions');
