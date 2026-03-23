import { BASE_URL } from './config';
import { post } from './index';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LoginResponse {
  access_token: string;
  restaurant_id: number;
  subscription_tier: string;
  name: string;
  employee_id: number;
  role_id: number;
  preferences: Record<string, any>;
  expires_in: number;
}

interface UserInfo {
  user_id: number;
  username: string;
  name: string;
  email?: string;
  restaurant_id: number;
  role_id: number;
  subscription_tier: string;
}

interface MeResponse {
  user: UserInfo;
  permissions: string[];
}

export const login = async (username: string, password: string): Promise<LoginResponse> => {
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
  } catch (networkErr: any) {
    throw new Error(
      `Network error connecting to backend at ${BASE_URL}: ${networkErr?.message || networkErr}`
    );
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
    expires_in: data.expires_in || 2592000, // Default to 30 days if missing
  };
};

export const logout = async (): Promise<void> => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    const res = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      console.warn(`Logout API failed: ${res.status}`);
    }
  } catch (err) {
    console.warn('Logout request failed:', err);
  }
};

export const me = async (): Promise<MeResponse> => {
  const token = await AsyncStorage.getItem('token');
  if (!token) {
    throw new Error('No token found');
  }

  const res = await fetch(`${BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch current user: ${res.status}`);
  }

  return res.json();
};
