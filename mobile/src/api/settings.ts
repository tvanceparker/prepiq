import { get, put, post } from './index';
import type { RestaurantSettings, AccountInfo } from '../interfaces/settings';
import type { POSModeSettings, ExternalPOSStatus } from '../interfaces/pos';

export const getRestaurantSettings = async () => get('/settings/restaurant_settings');
export const updateRestaurantSettings = async (data: Partial<any>) =>
  put('/settings/restaurant_settings', data);
export const getAccountInfo = async () => get('/settings/account-info');
export const updateUserPreferences = async (data: Record<string, any>) =>
  put('/settings/preferences', data);
export const updateEmail = async ({
  currentPassword,
  newEmail,
}: {
  currentPassword: string;
  newEmail: string;
}) => post('/settings/change_email', { current_password: currentPassword, new_email: newEmail });
export const updatePhone = async ({
  currentPassword,
  newPhone,
}: {
  currentPassword: string;
  newPhone: string;
}) => post('/settings/change_phone', { current_password: currentPassword, new_phone: newPhone });
export const changePassword = async ({
  currentPassword,
  newPassword,
}: {
  currentPassword: string;
  newPassword: string;
}) =>
  post('/settings/change_password', {
    current_password: currentPassword,
    new_password: newPassword,
  });

export const getPOSModeSettings = async (): Promise<POSModeSettings> => get('/settings/pos/mode');

export const updatePOSModeSettings = async (params: {
  pos_mode: 'none' | 'external';
  pos_provider?: string | null;
}): Promise<POSModeSettings> => {
  const queryParams = new URLSearchParams();
  queryParams.set('pos_mode', params.pos_mode);
  if (params.pos_provider) {
    queryParams.set('pos_provider', params.pos_provider);
  }
  return put(`/settings/pos/mode?${queryParams.toString()}`, {});
};

export const getPOSIntegrationStatus = async (): Promise<ExternalPOSStatus> =>
  get('/settings/pos/sync-status');

export const disconnectPOS = async (): Promise<{ success: boolean; message: string }> =>
  post('/settings/pos/disconnect', {});

export const triggerPOSSync = async (
  daysBack: number = 7
): Promise<{
  success: boolean;
  orders_synced: number;
  errors?: string[];
}> => post(`/settings/pos/sync-now?days_back=${daysBack}`, {});
