import { get, put, post } from './index';
import type { RestaurantSettings, AccountInfo } from '../interfaces/settings';
import type { POSModeSettings, ExternalPOSStatus, POSImportHealth } from '../interfaces/pos';

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
  pos_mode: 'internal' | 'external';
  pos_provider?: string | null;
  cash_drawer_enabled?: boolean;
}): Promise<POSModeSettings> => {
  const queryParams = new URLSearchParams();
  queryParams.set('pos_mode', params.pos_mode);
  if (params.pos_provider) {
    queryParams.set('pos_provider', params.pos_provider);
  }
  if (params.cash_drawer_enabled !== undefined) {
    queryParams.set('cash_drawer_enabled', String(params.cash_drawer_enabled));
  }
  return put(`/settings/pos/mode?${queryParams.toString()}`, {});
};

export const getPOSIntegrationStatus = async (): Promise<ExternalPOSStatus> =>
  get('/settings/pos/sync-status');

export const triggerPOSSync = async (
  daysBack: number = 7
): Promise<{
  status: string;
  orders_synced: number;
  items_synced: number;
  errors?: string[];
}> => post(`/settings/pos/sync-now?days_back=${daysBack}`, {});

export const disconnectPOS = async (): Promise<{
  status: 'disconnected' | 'not_connected';
  connected?: false;
  provider?: string;
}> => post('/settings/pos/disconnect', {});

export const getPOSImportHealth = async (limit: number = 10): Promise<POSImportHealth> =>
  get(`/settings/pos/import-health?limit=${limit}`);
