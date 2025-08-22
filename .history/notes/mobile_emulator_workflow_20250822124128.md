# Mobile Emulator & Expo Workflow

This document captures the one-time setup, daily workflow, and verification steps for running the Android emulator and the Expo (React Native) mobile client for Prepiq.

**Just run this**
QT_QPA_PLATFORM=xcb $HOME/Android/Sdk/emulator/emulator -avd "Pixel_7_API_34" -gpu swiftshader_indirect -no-snapshot -no-boot-anim

## 1. One-Time Environment Setup
Perform these once (already done in this repo environment):

1. Ensure Android SDK installed under `~/Android/Sdk` with command-line tools.
2. Add to your `~/.bashrc` (place near existing Android lines):
   ```bash
   export ANDROID_SDK_ROOT="$HOME/Android/Sdk"
   export ANDROID_HOME="$HOME/Android/Sdk"
   export PATH="$HOME/Android/Sdk/cmdline-tools/latest/bin:$HOME/Android/Sdk/platform-tools:$HOME/Android/Sdk/emulator:$PATH"
   ```
3. Remove /opt-based SDK paths from PATH (or uninstall) to avoid read‑only conflicts.
4. Install required platform & system image (already installed):
   ```bash
   sdkmanager "platforms;android-34" "system-images;android-34;google_apis;x86_64"
   yes | sdkmanager --licenses
   ```
5. Create the AVD (already created as `Pixel_7_API_34`):
   ```bash
   avdmanager create avd -n Pixel_7_API_34 -k "system-images;android-34;google_apis;x86_64" -d pixel_7 -g google_apis --abi x86_64
   ```

## 2. Daily Workflow (Fresh Session)
```bash
# Load env (if you just edited .bashrc)
source ~/.bashrc

# (Optional) Kill stray emulator / Expo from prior runs
pkill -f "emulator -avd Pixel_7_API_34" 2>/dev/null || true
pkill -f "expo start" 2>/dev/null || true

# Start emulator (hardware accel auto if /dev/kvm present)
emulator -avd Pixel_7_API_34 -no-snapshot -gpu swiftshader_indirect -netdelay none -netspeed full &

# Watch for device
adb wait-for-device
adb devices

# Start Expo bundler (from repo root or cd mobile)
cd mobile
npx expo start --android
```

Expo CLI should automatically install / open Expo Go inside the emulator if not already present, then load your app at the `exp://` URL.

## 3. Troubleshooting Quick Reference
| Symptom | Fix |
|---------|-----|
| `sdkmanager` or `avdmanager` using /opt path | Ensure PATH prepends `~/Android/Sdk/cmdline-tools/latest/bin` and export `ANDROID_SDK_ROOT`. |
| AVD marshalling read-only errors | Remove /opt SDK entries; recreate AVD. |
| Emulator not listed in `adb devices` | `adb kill-server && adb start-server`, then restart emulator. |
| Expo Go stuck on splash | Press `r` in Expo CLI or run `adb shell pm clear host.exp.exponent`. |
| Network calls to backend fail | Confirm emulator uses `10.0.2.2` for localhost backend, or run `adb reverse tcp:8000 tcp:8000`. |
| Need clean Metro cache | `npx expo start -c`. |

## 4. Common Commands
```bash
# List AVDs
avdmanager list avd

# Delete an AVD
avd_name=Pixel_7_API_34; rm -rf ~/.android/avd/${avd_name}.avd ~/.android/avd/${avd_name}.ini

# List installed system images
sdkmanager --list | grep system-images | grep installed

# Reverse backend port (if needed)
adb reverse tcp:8000 tcp:8000

# Open Expo DevTools URL (headless env may not show automatically)
# Provided by expo start output (copy/paste into browser if GUI available)
```

## 5. Current Session Verification
(Automatically filled after latest run on $(date +%Y-%m-%d).)

Status:

- Emulator AVD `Pixel_7_API_34` running (device id `emulator-5554` present in `adb devices`).
- Expo bundler started (host lan) and reported opening URL `exp://10.131.80.54:8081` on the emulator.
- Metro bundled successfully (log line: `Android Bundled ... index.ts`).
- Expo Go already installed (package `host.exp.exponent`).

Quick manual re-check commands:
```bash
adb devices
ps -ef | grep -i emulator | grep -v grep
cd mobile && npx expo start --android
```

## 6. Notes
- We intentionally pinned certain React Native / Expo-compatible versions; avoid arbitrary upgrades until a controlled dependency review.
- Use `-no-snapshot` to avoid corrupted snapshot-related boot issues.
