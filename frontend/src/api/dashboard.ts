import { get, post, put, del } from './index';
import { authFetch } from '../utils/authFetch';
import { BASE_URL } from './config';
import type {
  DailyOverviewDTO,
  MenuItemDTO,
  EodSalesEntriesInDTO,
  SalesConflictOutDTO,
} from '../interfaces/dashboardInterfaceFrontend';
import type { LiveOperationsData } from '../interfaces/liveOperations';
import type { QuickAnalyticsData } from '../interfaces/quickAnalytics';
import type { ProDailyOverviewData } from '../interfaces/proDailyOverview';

export const getDailyOverview = () => get<DailyOverviewDTO>('/dashboard/daily_overview');

export const getMenuItems = () => get<MenuItemDTO[]>('/dashboard/list_menu_items');
export const createMenuItem = (data: Partial<MenuItemDTO>) =>
  post('/dashboard/create_menu_item', data);
export const updateMenuItem = (menuItemId: number | string, data: Partial<MenuItemDTO>) =>
  put(`/dashboard/update/${menuItemId}`, data);
export const deleteMenuItem = (menuItemId: number | string) =>
  del(`/dashboard/delete/${menuItemId}`);

export const uploadMenuCSV = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const res = await authFetch(`${BASE_URL}/dashboard/upload-csv`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`CSV Upload Error: ${res.status} ${err}`);
  }
  return res.json();
};

export const downloadSalesTemplate = async (defaultDate?: string) => {
  let url = `${BASE_URL}/dashboard/sales-upload-template`;
  if (defaultDate) url += `?default_date=${encodeURIComponent(defaultDate)}`;

  const res = await authFetch(url, { method: 'GET' });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Download template failed: ${res.status} ${err}`);
  }

  const contentDisposition =
    res.headers.get('content-disposition') || res.headers.get('Content-Disposition');
  const defaultFileDate = defaultDate
    ? defaultDate.split('T')[0]
    : new Date().toISOString().slice(0, 10);
  let filename = `sale_template_${defaultFileDate}.xlsx`;
  if (contentDisposition) {
    const filenameStarMatch = contentDisposition.match(/filename\*=UTF-8''([^;\n\r]+)/i);
    const filenameMatch = contentDisposition.match(/filename="?([^";\n\r]+)"?/i);
    if (filenameStarMatch && filenameStarMatch[1]) {
      try {
        filename = decodeURIComponent(filenameStarMatch[1]);
      } catch (e) {
        filename = filenameStarMatch[1];
      }
    } else if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1];
    }
  }

  const blob = await res.blob();
  return { blob, filename };
};

export const uploadSalesData = async (file: File, overwrite = false) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('overwrite', overwrite ? 'true' : 'false');

  const res = await authFetch(`${BASE_URL}/dashboard/upload-sales-data`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${res.status}: ${err}`);
  }
  return res.json();
};

export const uploadSalesManual = (payload: EodSalesEntriesInDTO) =>
  post('/dashboard/upload-sales-manual', payload);

export const checkSalesExist = (sale_date: string, channels?: Array<string | null>) => {
  const params = new URLSearchParams({ sale_date });
  if (channels && channels.length)
    channels.forEach(ch => params.append('channels', ch === null ? 'null' : ch));
  const path = `/dashboard/sales-exist?${params.toString()}`;
  return get<SalesConflictOutDTO>(path);
};

export const getLiveOperations = (): Promise<LiveOperationsData> =>
  get<LiveOperationsData>('/dashboard/live-operations');

export const getQuickAnalytics = (days: number = 7): Promise<QuickAnalyticsData> =>
  get<QuickAnalyticsData>(`/dashboard/quick-analytics?days=${days}`);

export const getProDailyOverview = (): Promise<ProDailyOverviewData> =>
  get<ProDailyOverviewData>('/dashboard/pro-overview');
