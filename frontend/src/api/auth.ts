// src/api/auth.ts
import { BASE_URL } from './config';
import { get } from './index';

interface LoginResponse {
  access_token: string;
  restaurant_id: number;
  subscription_tier: string;
  name: string;
  employee_id: number;
  role_id?: number | null;
  preferences: Record<string, any>;
  expires_in: number;
}

interface UserInfo {
  user_id: number;
  username: string;
  name: string;
  email?: string;
  restaurant_id: number;
  role_id?: number | null;
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

  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
    credentials: 'include', // to receive refresh_token cookie
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Login failed: ${res.status} ${errText}`);
  }

  const data = await res.json();

  // Save access token to localStorage for convenience (still managed by context though)
  if (data.access_token) {
    localStorage.setItem('token', data.access_token);
  }

  // Return the full login response (including preferences and expires_in)
  return {
    access_token: data.access_token,
    restaurant_id: data.restaurant_id,
    subscription_tier: data.subscription_tier,
    name: data.name,
    employee_id: data.employee_id,
    role_id: data.role_id,
    preferences: data.preferences || {}, // fallback to empty object if missing
    expires_in: data.expires_in || 2592000, // Default to 30 days if missing
  };
};

export const logout = async (): Promise<void> => {
  try {
    const res = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
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
  const res = await fetch(`${BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch current user: ${res.status}`);
  }

  return res.json();
};

export const getRolesWithPermissions = () => get('/admin/roles-with-permissions');
