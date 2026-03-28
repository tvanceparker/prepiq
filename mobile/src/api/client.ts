import axios from 'axios';
import { BASE_URL } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { handleUnauthorizedSession } from './authSession';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  withCredentials: true,
});

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    const response = await axios.post(
      `${BASE_URL}/auth/refresh`,
      {},
      {
        withCredentials: true,
        timeout: 15000,
      }
    );

    const nextToken = response.data?.access_token as string | undefined;
    if (!nextToken) {
      return null;
    }

    await AsyncStorage.setItem('token', nextToken);
    return nextToken;
  } catch {
    return null;
  }
}

client.interceptors.request.use(async cfg => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      cfg.headers = cfg.headers || {};
      cfg.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // noop
  }
  return cfg;
});

client.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config as
      | (typeof error.config & { _retry?: boolean })
      | undefined;
    const requestUrl = originalRequest?.url ?? '';

    if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/refresh') ||
      requestUrl.includes('/auth/logout')
    ) {
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
      await handleUnauthorizedSession();
      return Promise.reject(error);
    }

    originalRequest.headers = originalRequest.headers || {};
    originalRequest.headers.Authorization = `Bearer ${refreshedToken}`;
    return client(originalRequest);
  }
);

export default client;
