// Derive the LAN host Expo is using so the emulator/physical device can reach the FastAPI backend.
// Fallbacks: Android emulator special 10.0.2.2, then localhost.
import Constants from 'expo-constants';
import { Platform } from 'react-native';

function resolveHost() {
  const hostUri = (Constants as any)?.expoConfig?.hostUri as string | undefined;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && /^(\d+\.\d+\.\d+\.\d+)$/.test(host)) return host; // LAN IPv4
  }
  if (Platform.OS === 'android') return '10.0.2.2';
  return 'localhost';
}

const HOST = process.env.API_HOST || resolveHost();
const PORT = process.env.API_PORT || '8000';
export const BASE_URL = process.env.API_BASE_URL || `http://${HOST}:${PORT}/api/v1`;

// WebSocket base URL (without /api/v1 prefix, using ws:// protocol)
export const WS_BASE_URL = process.env.WS_BASE_URL || `ws://${HOST}:${PORT}`;

// Keep a second export (some files import API_BASE_URL) pointing at root (no /api/v1) if needed.
export const API_BASE_URL = BASE_URL.replace(/\/api\/v1$/, '');
