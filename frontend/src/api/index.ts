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

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const response = await axios.post(
      `${BASE_URL}/auth/refresh`,
      {},
      {
        withCredentials: true,
      }
    );

    const nextToken = response.data?.access_token as string | undefined;
    if (!nextToken) return null;

    localStorage.setItem('token', nextToken);
    return nextToken;
  } catch {
    return null;
  }
};

// 🔐 Add Authorization header dynamically
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshAccessToken().finally(() => {
        isRefreshing = false;
      });
    }

    const refreshedToken = await refreshPromise;

    if (!refreshedToken) {
      localStorage.clear();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    originalRequest.headers = originalRequest.headers ?? {};
    originalRequest.headers.Authorization = `Bearer ${refreshedToken}`;
    return api(originalRequest);
  }
);

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
