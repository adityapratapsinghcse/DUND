# DEGRADE Trainee Mobile App (Expo / React Native)

A resilient mobile station for commanders and trainees in degraded communication exercises.

---

## 📱 Features
- **Live GPS Streaming**: Periodically transmits device coordinates to the server so electromagnetic jamming zones and signal degradation apply directly to real physical positioning.
- **One-Handed Thumb Controls**: High-contrast, large touch targets for combat decision-making (`MOVE`, `HOLD`, `FIRE SUPPORT`, `REQUEST ISR`, `VERIFY`, `FALLBACK COMMS`).
- **Resilient Fallback**: Automatic reconnect with last-known intelligence cache and connection indicators.
- **Sand & Sage Palette**: Dynamic light and dark theme toggle.
- **LAN-Ready**: Configurable server IP/URL in Settings for offline field deployment.

---

## 🚀 Running on Physical Device with Expo Go (Same Wi-Fi)

### 1. Identify Host Machine LAN IP
In terminal (PowerShell):
```powershell
ipconfig
# Find IPv4 Address, e.g. 192.168.1.45
```

### 2. Start Expo Development Server
From repository root:
```bash
npm --workspace=mobile run start
```
Or inside `mobile/`:
```bash
npx expo start --clear
```

### 3. Open on Android or iOS
1. Install **Expo Go** from Google Play Store or Apple App Store.
2. Ensure both device and host PC are connected to the same Wi-Fi network.
3. Scan the QR code displayed in the terminal with Expo Go.
4. On the login screen, open **Settings (⚙️)** and configure the Server URL to your host IP:
   `http://192.168.1.45:8000`
5. Tap **Land 1** to sign in and enter your exercise code!

---

## 📦 Building Standalone APK with EAS (Expo Application Services)

To produce an installable standalone Android APK for offline defense deployments:

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   eas login
   ```
2. Configure build profile:
   ```bash
   eas build:configure
   ```
3. Run local or cloud APK build:
   ```bash
   eas build -p android --profile preview
   ```
4. Download the generated `.apk` file and sideload onto Android hardware.
