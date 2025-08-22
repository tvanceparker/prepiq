import { get, post, put, del } from './index';

export const getDailyOverview = () => get('/dashboard/daily_overview');
export const getMenuItems = () => get('/dashboard/list_menu_items');
export const createMenuItem = (data: any) => post('/dashboard/create_menu_item', data);
export const updateMenuItem = (menuItemId: string | number, data: any) =>
  put(`/dashboard/update/${menuItemId}`, data);
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

export const uploadSalesData = async (file: any, overwrite = false) => {
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

export const uploadSalesManual = async (payload: {
  sale_date: string; // YYYY-MM-DD
  overwrite?: boolean;
  entries: Array<{ menu_item_id: number; quantity_sold: number; sales_channel?: string }>;
}) => post('/dashboard/upload-sales-manual', payload);
