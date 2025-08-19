import { BASE_URL } from './config';
import { post } from './index';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const login = async (username: string, password: string) => {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
    });
  } catch (networkErr:any) {
    throw new Error(`Network error connecting to backend at ${BASE_URL}: ${networkErr?.message || networkErr}`);
  }

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

