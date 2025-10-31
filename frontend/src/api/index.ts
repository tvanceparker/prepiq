// src/api/index.ts
import axios from 'axios';
import { BASE_URL } from './config';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // if you're using cookies; otherwise remove this
});

// 🔐 Add Authorization header dynamically
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const get = async <T>(endpoint: string): Promise<T> => {
  const response = await api.get<T>(endpoint);
  return response.data;
};

export const post = async <T>(endpoint: string, data?: any): Promise<T> => {
  const response = await api.post<T>(endpoint, data);
  return response.data;
};

export const put = async <T>(endpoint: string, data?: any): Promise<T> => {
  const response = await api.put<T>(endpoint, data);
  return response.data;
};

export const patch = async <T>(endpoint: string, data?: any): Promise<T> => {
  const response = await api.patch<T>(endpoint, data);
  return response.data;
};

export const del = async <T>(endpoint: string): Promise<T> => {
  const response = await api.delete<T>(endpoint);
  return response.data;
};

export { api };
