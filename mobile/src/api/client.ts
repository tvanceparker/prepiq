import axios from 'axios';
import { BASE_URL } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

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

export default client;
