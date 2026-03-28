import AsyncStorage from '@react-native-async-storage/async-storage';

type UnauthorizedHandler = () => Promise<void> | void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function registerUnauthorizedHandler(handler: UnauthorizedHandler) {
  unauthorizedHandler = handler;

  return () => {
    if (unauthorizedHandler === handler) {
      unauthorizedHandler = null;
    }
  };
}

export async function clearStoredAuthSession() {
  await Promise.all([
    AsyncStorage.removeItem('token'),
    AsyncStorage.removeItem('tier'),
    AsyncStorage.removeItem('user'),
  ]);
}

export async function handleUnauthorizedSession() {
  await clearStoredAuthSession();

  if (unauthorizedHandler) {
    await unauthorizedHandler();
  }
}