# Android Emulator on Arch Linux + Hyprland/Wayland

This note shows how to create a script called `run-avd` so you can easily start Android Virtual Devices (AVDs) with a visible phone window on Arch Linux running Hyprland/Wayland.

---

## Step 1: Create the script

Make sure `~/.local/bin` exists and is in your `$PATH`. Then create the script:

```bash
mkdir -p ~/.local/bin
nano ~/.local/bin/run-avd
