import axios from 'axios';
import { API_BASE_URL } from '../config';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

client.interceptors.request.use((cfg) => {
  // You can attach auth token here from async storage
  return cfg;
});

export default client;
