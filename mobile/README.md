# Groveno Fresh — Customer Mobile App

React Native + Expo SDK 54 + TypeScript

## Quick Start

```bash
cd /app/mobile
npm install -g expo-cli   # if not already installed
npx expo start
```

Scan the QR code with the **Expo Go** app on your phone.

> **Note**: `react-native-maps` requires a **development build** (not Expo Go).  
> Build with: `npx expo run:android` or `npx expo run:ios`

## Environment

`.env` is pre-configured to point to the Groveno backend:
```
EXPO_PUBLIC_API_URL=https://delivery-coins.preview.emergentagent.com
```

## Demo Login

1. Enter any 10-digit phone number (e.g. `9876543210`)
2. Enter any 4-digit OTP (e.g. `1234`)
3. You're in!

## Screens

| Auth | Home | Cart / Checkout |
|------|------|-----------------|
| Splash | Home | Cart |
| Onboarding | Categories | Channel Selection |
| Login | Product Listing | Home Delivery Checkout |
| OTP | Product Detail | Express Pickup |
| | Search | Express Pickup Tracking |
| | | Payment |
| | | Order Success |

| Orders | Wallet / Refer | Profile |
|--------|---------------|---------|
| My Orders | Wallet | Account |
| Rating Popup | Refer & Earn | |
| | My Referrals | |

## Build for Production

```bash
npx eas build --platform android
npx eas build --platform ios
```

App ID: `com.grovenoFresh`
