# Android Emulator on Arch Linux + Hyprland/Wayland

This note shows how to create a script called `run-avd` so you can easily start Android Virtual Devices (AVDs) with a visible phone window on Arch Linux running Hyprland/Wayland.

---

## Step 1: Create the script

Make sure `~/.local/bin` exists and is in your `$PATH`. Then create the script:

```bash
mkdir -p ~/.local/bin
nano ~/.local/bin/run-avd

#!/usr/bin/env bash
# Run an Android Virtual Device cleanly on Wayland/Hyprland

AVD_NAME="$1"

if [ -z "$AVD_NAME" ]; then
  echo "Usage: run-avd <AVD_NAME>"
  exit 1
fi

# Kill any stale emulator processes
adb devices | grep emulator | cut -f1 | while read -r emulator; do
  echo "Killing $emulator..."
  adb -s "$emulator" emu kill
done

# Launch emulator with safe defaults
QT_QPA_PLATFORM=xcb $HOME/Android/Sdk/emulator/emulator \
  -avd "$AVD_NAME" \
  -gpu swiftshader_indirect \
  -no-snapshot \
  -no-boot-anim
