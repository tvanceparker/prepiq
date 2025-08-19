import client from './client';

export const get = async <T = any>(endpoint: string): Promise<T> => {
  const res = await client.get<T>(endpoint);
  return res.data;
};

export const post = async <T = any>(endpoint: string, data?: any): Promise<T> => {
  const res = await client.post<T>(endpoint, data);
  return res.data;
};

export const put = async <T = any>(endpoint: string, data?: any): Promise<T> => {
  const res = await client.put<T>(endpoint, data);
  return res.data;
};

export const patch = async <T = any>(endpoint: string, data?: any): Promise<T> => {
  const res = await client.patch<T>(endpoint, data);
  return res.data;
};

export const del = async <T = any>(endpoint: string): Promise<T> => {
  const res = await client.delete<T>(endpoint);
  return res.data;
};

export default client;
