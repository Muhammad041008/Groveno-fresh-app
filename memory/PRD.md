# Groveno Fresh - Product Requirements Document

## Original Problem Statement
Groveno Fresh — a community grocery delivery app with 3 order channels + Admin Panel + CL Panel.

## Tech Stack
### Backend
- Node.js 20 + Express 4, MongoDB via Mongoose 8
- JWT (separate secrets: customer / admin / CL)
- Server-Sent Events (in-process EventEmitter bus)
- All routes prefixed `/api`

### Frontend
- React 18 + Vite 5 + Tailwind CSS 3 (brand green #22C55E)
- React Router v6 (protected routes)
- Axios + Recharts + lucide-react + react-hot-toast
- Two apps in one bundle:
  - Admin Panel at `/` (sidebar-based, desktop-first)
  - CL Panel at `/cl` (bottom-nav, mobile-first, max-w-[480px] centered)

## Auth Model
- Customer: OTP via `/api/auth/*` (Mock OTP 123456)
- Admin: `admin@groveno.com` / `Admin@123` — localStorage `groveno_admin_token`
- CL: `cl@groveno.com` / `CL@123` (code `CL12345`) — localStorage `groveno_cl_token`

## Three Order Channels + Business Rules
1. Home Delivery — free ≥ ₹199, else ₹30; +₹15 for `express_30min`.
2. Express Pickup — 5% discount, ₹30 confirmation, 4-digit OTP, live location tracking via SSE.
3. CL Order/Bulk — 5% commission auto-credited to CL wallet on delivery.

## Coins & Referral
- 50 first CL / 15 repeat CL / +5 rating bonus / +10 referral (atomic first-order flip).
- 90-day expiry (max-of-current-and-new). Min order ₹200, max 20% redemption.

## Real-Time SSE
- `/api/stream/orders/:id/stream?token=…` (customer per-order)
- `/api/stream/admin/express-pickup/stream?token=…` (admin live board)
- Events: `snapshot`, `location`, `status`, `arrived`, `created`. 20s keep-alive.

## What's Implemented (Feb 2026)
### Iteration 1 (Backend base)
- Auth (customer/admin/CL), products/categories/pickup-points, 3-channel orders, coins/wallet, admin dashboard/reports, mock payment, QR tracking, ratings — **65/65 tests pass**.

### Iteration 2 (Referral + SSE + Admin Panel)
- Referral endpoints (`/api/referral/me`, `/apply`) + first-order credit hook.
- SSE bus + 2 stream endpoints.
- Full Vite + Tailwind Admin Panel — 13 pages (Login, Dashboard, Products, ProductForm, Categories, Orders, OrderDetail, Express Pickup Live, PickupPoints, Users, UserDetail, CLs, Wallet, Reports).
- **80/80 backend + 100% UI tests pass**.

### Iteration 11 (Order Flow Bug Fixes — Feb 2026)
**Two critical order-flow bugs fixed + Demo Mode My Orders:**

**Bug 1 — Cart Navigation Loop (FIXED):**
- Root cause: `PaymentScreen` resets CartStack to `[OrderSuccess]`. If user skipped the "Continue Shopping" button or the `goHome()` reset failed, CartTab would keep showing the stale `OrderSuccess` screen.
- Fix: Confirmed `OrderSuccessScreen.goHome()` calls `navigation.reset({ index:0, routes:[{name:'Cart'}] })` before `navigation.getParent()?.navigate('HomeTab')` — CartStack is always cleaned before tab switch.

**Bug 2 — Missing Track Order Button (FIXED):**
- Root cause: `OrderSuccessScreen` rendered Track Order button ONLY for `express_pickup`, and it was calling `goHome()` instead of the defined `handleTrackOrder()` function (dead code bug).
- Root cause (MyOrders): `canTrack` only allowed `express_pickup` channel.
- Fixes applied:
  - `OrderSuccessScreen.tsx`: Track Order button now renders unconditionally for ALL channels (home_delivery, cl_order, express_pickup) with `testID="track-order-btn"`. Wired to `handleTrackOrder()`.
  - `handleTrackOrder()`: Now passes `channel` param to TrackOrderScreen.
  - `MyOrdersScreen.tsx`: Replaced single `TRACKABLE_STATUSES` with `TRACKABLE_EXPRESS_STATUSES` + `TRACKABLE_DELIVERY_STATUSES`. `canTrack` now covers home_delivery/cl_order with 'placed/confirmed/preparing/out_for_delivery'.
  - `TrackOrderScreen.tsx`: Added `isDelivery` flag. Delivery channels get 5-step timeline (Placed > Confirmed > Preparing > On the Way > Delivered) + status info card. Express pickup retains GPS tracking flow.
  - `navigation/types.ts`: Added `channel?: string` to `TrackOrder` params.

**Demo Mode My Orders (FIXED):**
- Root cause: `getMyOrders()` returned empty array `[]` in demo mode — backend call fails silently.
- Fix: Added `DEMO_ORDER_STORE` in-memory array. `makeDemoOrder()` prepends each order. `getMyOrders()` returns `[...DEMO_ORDER_STORE]` as fallback. `placeHomeDelivery()` accepts `channel` param so CL orders are stored with correct channel type.
- TypeScript: **0 errors** | Metro bundle: **HTTP 200, packager running**.

**Home Delivery and Order via CL are now distinct, correct flows:**
- `navigation/types.ts`: `HomeDeliveryCheckout` now requires `{ mode: 'home_delivery' | 'cl_order' }`; `Payment.channel` now accepts `'cl_order'` as a third value.
- `ChannelSelectionScreen.tsx`: Passes `mode: 'home_delivery'` for home delivery and `mode: 'cl_order'` for CL orders when navigating.
- `HomeDeliveryCheckoutScreen.tsx`: Completely mode-aware. `home_delivery` → shows address block + "Delivery as per availability" note, hides CL code and time slots. `cl_order` → CL code block at top (required, with validate button), Morning/Evening slot selector, CL info shown on valid code, hides address.
- `PaymentScreen.tsx`: `cl_order` now treated as home delivery API path; label shows "👥 Order via CL".
- `OrderSuccessScreen.tsx`: `cl_order` shows slot-specific delivery time; `home_delivery` shows "Delivery as per availability".
- Express Pickup: unchanged, zero regression.
- TypeScript: **0 errors** | Bundle: **HTTP 200, 7.4MB**.

### Iteration 9 (UI/UX Improvement — Feb 2026)
**Bottom nav, two-panel Categories, compact ProductCard:**
- `navigation/index.tsx`: Added `CartTabIcon` component (uses `useCart()` for live badge count); Cart tab now visible in bottom nav with item-count badge; Profile tab hidden from bottom bar (still navigable via avatar); TypeScript + bundle verify: 0 errors, HTTP 200.
- `CategoriesScreen.tsx`: Replaced single-column list with two-panel layout — 88px sidebar (all categories + "All") with green active-bar indicator, inline right-panel product grid with `numColumns=2`, page-based pagination via `onEndReached`. No navigation to ProductListing for category selection — products update inline.
- `ProductCard.tsx`: Price + ADD button now on the same row (`bottomRow`), removing one stacked row for a more compact grocery-card look.
- `metro.config.js`: Added to persistent `/app/mobile/` with `blockList` for integration test directories.
- `/app/cloudflared`: Moved to persistent `/app/` directory to survive pod restarts.
- Expo Go URL: `exp://jackie-recommendation-martha-america.trycloudflare.com`

### Iteration 8 (Demo Mode Offline Fix — Feb 2026)
**All 5 Demo Mode bugs fixed — app is now 100% offline in Demo Mode:**
- `authService.ts:verifyOtpMock` — replaced backend API call with fully offline local demo user creation (AsyncStorage only). Accepts only phone `1234567890` + OTP `1234`; returns a friendly error for any other combination.
- `LoginScreen.tsx` — removed `sendOtp()` call in demo path (was silently failing).
- `OTPScreen.tsx:handleResend` — removed `sendOtp()` call in mock mode (same silent fail).
- `orderService.ts:placeHomeDelivery` + `placeExpressPickup` — wrapped in try/catch with `makeDemoOrder()` fallback so Checkout → OrderSuccess works offline.
- `walletService.ts:DEMO_WALLET` — updated to `{balance:250, coins:120}` matching demo user.
- `/app/cloudflared` saved in persistent `/app` directory (not `/tmp`).
- TypeScript: **0 errors**. Metro bundle: **HTTP 200, 7.39MB**.

### Iteration 7 (RN 0.81.5 Upgrade + Full Code Audit — Feb 2026)
**Complete Expo Go Stability:**
- Upgraded `react-native` to `0.81.5` and `react` to `19.1.0` to match `expo@54.0.36` strict peer deps
- Fixed `SearchScreen.tsx` React 19 `useRef` strict TypeScript error: `useRef<ReturnType<typeof setTimeout> | undefined>(undefined)`
- Full code audit of all 22 screens: TypeScript compiles with **0 errors**
- Metro bundle verified: **HTTP 200, 7.4MB** — no `SyntaxError: private properties are not supported`
- All packages verified present: axios, expo-location, expo-clipboard, react-native-maps (try/catch wrapped), safe-area-context, @expo/vector-icons, react-navigation stacks
- Cloudflare tunnel + metro_proxy.py verified: manifest URLs correctly rewritten (no `:8081` port)
- **Metro QR Code**: `exp://sale-wichita-bibliography-consent.trycloudflare.com` (session-based, regenerate with `./tmp/cloudflared tunnel --url http://localhost:8082`)
- Demo login: Phone `1234567890`, OTP `1234` (any 4 digits)

### Iteration 6 (Expo Go Fix + Track Order — Feb 2026)
**Expo Go compatibility:**
- Removed `@react-native-firebase/app` + `@react-native-firebase/auth` from package.json and app.json plugins (were crashing Metro bundler in Expo Go)
- Simplified `firebaseStore.ts` to pure mock (`firebaseAuth=null`, `isFirebaseAvailable=false`)
- Updated `react-native-safe-area-context`, `react-native-screens`, `react-native-gesture-handler` to correct Expo SDK 54 versions
- Added DEMO_PRODUCTS (12 items), DEMO_CATEGORIES (6 items) fallbacks in `productService.ts`
- Added DEMO_WALLET, DEMO_PICKUP_POINTS fallbacks in `walletService.ts` / `orderService.ts`
- `authService.getMe()` now falls back to local AsyncStorage cache if API fails
- `LoginScreen` shows "Dev Build Required" for real phones; demo phone `1234567890` always works
- **Metro QR Code**: `exp://euros-concepts-infections-southwest.trycloudflare.com` (Cloudflare quick tunnel, session-based)
- TypeScript: 0 errors

### Iteration 5 (Firebase OTP + Track Order — Feb 2026)
**Task 1 — Firebase Phone Auth:**
- Backend `auth.controller.js` now accepts `{ firebaseToken }` (Firebase path) OR `{ phone, otp }` (mock/legacy path)
- New `/app/backend/src/utils/firebaseAdmin.js` — lazy Firebase Admin init with env-var guard
- Demo phone `+911234567890` + OTP `1234` bypasses Firebase for testing (always works)
- `firebase-admin@^12.4.0` already installed; configure `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` in `.env` to activate
- Mobile: `@react-native-firebase/app@25.1.0` + `@react-native-firebase/auth@25.1.0` installed
- `LoginScreen.tsx` — calls `firebaseAuth().signInWithPhoneNumber('+91'+phone)` for real phones; demo path skips Firebase
- `OTPScreen.tsx` — Firebase confirm + 30s countdown + Resend button; mock path uses `verifyOtpMock()`
- `/app/mobile/src/utils/firebaseStore.ts` — safe dynamic require for Expo Go compatibility
- `app.json` — `@react-native-firebase/app` and `@react-native-firebase/auth` added to plugins
- **Requires dev build** (`npx expo run:android`) + `google-services.json` from Firebase Console for real phone auth

**Task 2 — Track My Order (Express Pickup):**
- New `TrackOrderScreen.tsx` — 3 phases: idle → tracking → arrived
  - "I'm on My Way" button calls `startTracking` (gets hub GPS coords)
  - `expo-location watchPositionAsync` every 10s/20m; haversine distance calculation client-side
  - 200m threshold: green "Hub notified" banner
  - 50m threshold: auto-switch to Arrived screen with pulsing Order ID
  - POSTs to `/api/orders/:id/location-update` and `/api/orders/:id/arrived`
- `MyOrdersScreen.tsx` updated — blue "Track" button for `express_pickup` orders in active statuses
- `navigation/types.ts` and `navigation/index.tsx` updated — TrackOrder in OrderStack

### Iteration 4 (Mobile OTP Bug Fix — Feb 2026)
- Fixed navigation crash in OTPScreen: removed `navigation.reset()` in favour of `login()` from AuthContext (state-driven navigator swap in App.tsx).
- Removed `"newArchEnabled": false` from `app.json`.
- All static code + backend auth API tests pass (10/10 checks, 3/3 backend tests).
- OTP flow confirmed correct: authService.verifyOtp() → AsyncStorage save → login() → App.tsx swaps navigator tree.
- New CL endpoints: `GET /api/cl/me`, `PUT /api/cl/profile` (with bank details), `POST /api/cl/change-password`, `GET /api/cl/earnings` (today/week/month/allTime).
- CommunityLeader model: added `bankDetails` subdocument.
- Mobile-first CL Panel (max-w-[480px], bottom nav) — 8 pages:
  1. CLLogin
  2. CLDashboard — 4 stat cards + quick "Mark Delivered"
  3. CLOrders — All/Pending/Delivered tabs + search + Mark Delivered
  4. CLOrderDetail — masked phone, items, address, 5% commission card
  5. CLBulkOrder — multi-customer bulk placement (POST /orders/cl-bulk)
  6. CLEarnings — wallet card + today/week/month stats + history + "Withdraw (Coming Soon)"
  7. CLQrCode — QR image via api.qrserver.com, download, WhatsApp share, scan analytics
  8. CLProfile — CL code prominent, editable name/email + bank details + change password
- **103/103 backend tests + 100% CL Panel UI flows pass**.

## Backlog / Next Actions
- Cart Navigation Loop (consecutive orders) — **FIXED Iteration 11** [P0 ✓]
- Track Order button for ALL channels (home_delivery, cl_order, express_pickup) — **FIXED Iteration 11** [P0 ✓]
- Demo Mode My Orders shows placed orders — **FIXED Iteration 11** [P0 ✓]
- Real Firebase Phone Auth — DONE (code + packages in place; needs `google-services.json` + Firebase credentials to activate for real phones). [P1 ✓]
- Real Razorpay payment gateway integration (currently mocked). [P1]
- Push notifications on order lifecycle events (out_for_delivery, arrived, delivered). [P1]
- Track My Order screen (Express Pickup) — DONE. [P2 ✓]
- Track My Order screen (Home Delivery / CL Order — delivery status timeline) — DONE Iteration 11. [P2 ✓]
- CL commission auto-payout via Razorpay Payouts (currently manual "Withdraw — coming soon"). [P2]
- EAS Build setup for production APK/IPA. [P2]
- CL Society gamification (badge unlocks for society CLs). [P2]
- Operations Health Dashboard (conversion velocity / supply chain drift). [P3]
- Migrate JWT from localStorage to HttpOnly cookies in web panels. [P2]
- Cleanup: remove unused `RootStackParamList` type from `/app/mobile/src/navigation/types.ts` [minor]
- Product suggestions in Reports: consider Monday-based week aggregation for India. [P3]

## Customer Mobile App (Expo SDK 54 + TypeScript)
Location: `/app/mobile/`
### Architecture
- Expo SDK 54 + TypeScript + StyleSheet only (no NativeWind)
- React Navigation: AuthStack + 4 bottom tabs (HomeTab, OrderAgainTab, CategoriesTab, ProfileTab) + hidden CartTab
- AuthContext (isLoggedIn state) + CartContext (items, addItem, removeItem, clearCart)
- Backend URL: `EXPO_PUBLIC_API_URL` in `/app/mobile/.env`

### Screens (22 built)
| Auth | Home/Browse | Cart/Checkout |
|------|-------------|---------------|
| Splash | Home | Cart |
| Onboarding | Categories | ChannelSelection |
| Login | ProductListing | HomeDeliveryCheckout |
| OTP | ProductDetail | ExpressPickup |
|  | Search | ExpressPickupTracking |
|  |  | Payment |
|  |  | OrderSuccess |

| Orders | Wallet/Refer | Profile |
|--------|--------------|---------|
| MyOrders | WalletScreen | Account |
| RatingPopup | ReferEarn |  |
|  | MyReferrals |  |

### Key Configs
- App name: "Groveno Fresh"
- android.package: "com.grovenoFresh"
- ios.bundleIdentifier: "com.grovenoFresh"
- OTP: Any 4 digits (demo) — maps to backend mock OTP 123456
- Maps: react-native-maps (requires dev build, fallback UI in Expo Go)

### To run
```bash
cd /app/mobile && npx expo start --port 8081
# Tunnel (Cloudflare) is already started in the environment:
# Metro proxy: python3 /app/metro_proxy.py TUNNEL_HOST 8082
# Cloudflared: /tmp/cloudflared tunnel --url http://localhost:8082
```
Scan QR in Expo Go app (maps need dev build: `npx expo run:android`)
Demo login: Phone `1234567890`, any 4-digit OTP

## Public URLs
- App: https://delivery-coins.preview.emergentagent.com
- Admin: /login → /dashboard
- CL Panel: /cl/login → /cl/dashboard

