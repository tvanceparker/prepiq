// config.js
export const BASE_URL =
    window.location.hostname === "localhost"
        ? "http://localhost:8000/api/v1"
        : `http://${window.location.hostname}:8000/api/v1`;
