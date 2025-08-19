import { get, put, post } from './index';
import type { RestaurantSettings, AccountInfo } from '../../frontend/src/interfaces/settings';

export const getRestaurantSettings = async () => get('/settings/restaurant_settings');
export const updateRestaurantSettings = async (data: Partial<any>) => put('/settings/restaurant_settings', data);
export const getAccountInfo = async () => get('/settings/account-info');
export const updateUserPreferences = async (data: Record<string, any>) => put('/settings/preferences', data);
export const updateEmail = async ({ currentPassword, newEmail }: { currentPassword: string; newEmail: string }) =>
  post('/settings/change_email', { current_password: currentPassword, new_email: newEmail });
export const updatePhone = async ({ currentPassword, newPhone }: { currentPassword: string; newPhone: string }) =>
  post('/settings/change_phone', { current_password: currentPassword, new_phone: newPhone });
export const changePassword = async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
  post('/settings/change_password', { current_password: currentPassword, new_password: newPassword });
