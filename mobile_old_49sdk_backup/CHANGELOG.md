# Changelog

## 0.1.0
- Initial mobile scaffold (Expo + TypeScript).
- Basic auth flow (Login -> Home) wired to FastAPI `/api/v1/auth/login`.
- Axios client, React Query, React Hook Form, Yup, React Native Paper integrated.
- EAS build profile for Android APK.

# Web changes required
- Expose CORS for mobile origins and ensure the API serves requests from device IPs.
- For auth tokens, ensure same JWT contracts as web; mobile stores token in AsyncStorage.
- If using cookie-based sessions, switch to token-based auth for mobile.
