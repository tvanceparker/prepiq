// src/utils/toast.js
import { toast } from "react-toastify";

export const showSuccess = (message, options = {}) =>
    toast.success(message, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        pauseOnHover: true,
        draggable: true,
        theme: "colored",
        ...options,
    });

export const showError = (message, options = {}) =>
    toast.error(message, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        pauseOnHover: true,
        draggable: true,
        theme: "colored",
        ...options,
    });

export const showInfo = (message, options = {}) =>
    toast.info(message, {
        position: "top-right",
        autoClose: 3000,
        ...options,
    });

export const showWarning = (message, options = {}) =>
    toast.warn(message, {
        position: "top-right",
        autoClose: 3000,
        ...options,
    });
