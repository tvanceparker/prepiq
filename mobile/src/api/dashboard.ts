import { get, post, put, del } from './index';
import client from './index';
import type {
  DailyOverviewDTO,
  MenuItemDTO,
  EodSalesEntriesInDTO,
  SalesConflictOutDTO,
  SalesUploadResponseDTO,
} from '../interfaces/dashboard';

export const getDailyOverview = () => get<DailyOverviewDTO>('/dashboard/daily_overview');
export const getMenuItems = () => get<MenuItemDTO[]>('/dashboard/list_menu_items');
export const createMenuItem = (data: any) => post('/dashboard/create_menu_item', data);
export const updateMenuItem = async (menuItemId: string | number, data: any) => {
  const path = `/dashboard/update/${menuItemId}`;
  try {
    const res = await client.put(path, data);
    return res.data;
  } catch (err: any) {
    // Surface server validation details if present
    const serverMsg = err?.response?.data || err?.response?.data?.detail || err?.message;
    throw new Error(
      `Update failed: ${typeof serverMsg === 'string' ? serverMsg : JSON.stringify(serverMsg)}`
    );
  }
};
export const deleteMenuItem = (menuItemId: string | number) =>
  del(`/dashboard/delete/${menuItemId}`);

export const uploadMenuCSV = async (file: any) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(
    `${process.env.API_BASE_URL || 'http://10.0.2.2:8000/api/v1'}/dashboard/upload-csv`,
    {
      method: 'POST',
      body: formData,
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`CSV Upload Error: ${res.status} ${err}`);
  }
  return res.json();
};

export const downloadSalesTemplate = async (defaultDate?: string) => {
  let url = `${
    process.env.API_BASE_URL || 'http://10.0.2.2:8000/api/v1'
  }/dashboard/sales-upload-template`;
  if (defaultDate) url += `?default_date=${encodeURIComponent(defaultDate)}`;
  const res = await fetch(url, { method: 'GET' });
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

export const uploadSalesData = async (
  file: any,
  overwrite = false
): Promise<SalesUploadResponseDTO> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('overwrite', overwrite ? 'true' : 'false');
  const res = await fetch(
    `${process.env.API_BASE_URL || 'http://10.0.2.2:8000/api/v1'}/dashboard/upload-sales-data`,
    { method: 'POST', body: formData }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${res.status}: ${err}`);
  }
  return res.json();
};

export const uploadSalesManual = async (payload: EodSalesEntriesInDTO) =>
  post<SalesUploadResponseDTO>('/dashboard/upload-sales-manual', payload);

export const checkSalesExist = async (
  sale_date: string,
  channels?: Array<string | null>
): Promise<SalesConflictOutDTO> => {
  // Build query string manually to ensure repeated 'channels' params are encoded as `channels=value` multiple times
  const params = new URLSearchParams({ sale_date });
  if (channels && channels.length)
    channels.forEach(ch => params.append('channels', ch === null ? 'null' : ch));
  const path = `/dashboard/sales-exist?${params.toString()}`;
  try {
    const res = await client.get<SalesConflictOutDTO>(path);
    return res.data;
  } catch (err: any) {
    // If server returns 404 for this route, treat as no conflicts so submit can proceed; surface other errors
    const status = err?.response?.status;
    if (status === 404) return { sale_date, conflicts: {} } as SalesConflictOutDTO;
    throw err;
  }
};
