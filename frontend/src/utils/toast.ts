// src/utils/toast.ts
import { toast, ToastOptions } from 'react-toastify';

const defaultOptions: ToastOptions = {
  position: 'top-right',
  autoClose: 3000,
  hideProgressBar: false,
  pauseOnHover: true,
  draggable: true,
  theme: 'colored',
};

export const showSuccess = (
  message: string,
  options: ToastOptions = {}
): ReturnType<typeof toast.success> =>
  toast.success(message, {
    ...defaultOptions,
    ...options,
  });

export const showError = (
  message: string,
  options: ToastOptions = {}
): ReturnType<typeof toast.error> =>
  toast.error(message, {
    ...defaultOptions,
    ...options,
  });

export const showInfo = (
  message: string,
  options: ToastOptions = {}
): ReturnType<typeof toast.info> =>
  toast.info(message, {
    ...defaultOptions,
    autoClose: 3000,
    ...options,
  });

export const showWarning = (
  message: string,
  options: ToastOptions = {}
): ReturnType<typeof toast.warn> =>
  toast.warn(message, {
    ...defaultOptions,
    autoClose: 3000,
    ...options,
  });
