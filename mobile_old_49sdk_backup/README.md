# Prepiq Mobile (Expo + TypeScript)

This folder is a starter React Native (Expo) TypeScript app that mirrors the web frontend and connects to the FastAPI backend in the repo.

Quick setup

1. Install dependencies

```bash
cd mobile
npm install
```

2. Start the dev server

```bash
npm run start
```

3. Run on Android emulator/device

```bash
npm run android
```

Build APK using EAS (recommended for production-like builds):

```bash
# login to expo account
eas login
# build
npm run build:android
```

How the app connects to backend

- Edit `src/config.ts` and set `API_BASE_URL` to your FastAPI base (e.g. `http://10.0.2.2:8000` for Android emulators or your machine IP).

Notes / TODO

- This is a starter scaffold implementing React Navigation, React Query, Axios, React Hook Form, Yup, React Native Paper.
- The UI theme maps to the web MUI colors; tweak `src/theme.ts` to match exact tokens.
- Follow Android/iOS docs for permissions when adding new native modules.
