import { useState, useContext } from 'react';
import { AuthContext } from '../../../contexts/AuthContext';
import { login as apiLogin } from '../../../api/auth';

export function useLogin() {
  const { login } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (username: string, password: string) => {
    setLoading(true); setError('');
    try {
  const data = await apiLogin(username.trim(), password);
      await login({
        token: data.access_token,
        tier: data.subscription_tier,
        user: { username, name: data.name, restaurant_id: data.restaurant_id, employee_id: data.employee_id, role_id: data.role_id },
        preferences: data.preferences,
      });
      return true;
    } catch (e:any) {
      setError(e.message||'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { handleLogin, loading, error, setError };
}
