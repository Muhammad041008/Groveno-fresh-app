# Groveno Fresh - Product Requirements Document

## Original Problem Statement
Groveno Fresh — a community grocery delivery app with 3 order channels + Admin Panel.

## Tech Stack
### Backend
- Node.js 20 + Express 4
- MongoDB via Mongoose 8
- JWT (separate secrets: customer / admin / CL)
- bcryptjs, cors, helmet, morgan, uuid
- Server-Sent Events (in-process EventEmitter bus, no external broker)

### Frontend (Admin Panel)
- React 18 + Vite 5
- Tailwind CSS 3 with brand green palette (#22C55E primary, #14532D dark)
- React Router v6 (protected routes via `Protected` wrapper)
- Axios with token interceptor (localStorage `groveno_admin_token`)
- Recharts (Line + Bar + Pie)
- lucide-react icons, react-hot-toast

## Architecture
- Supervisor runs `node server.js` on 0.0.0.0:8001 and `yarn dev` (Vite) on 0.0.0.0:3000.
- All API routes prefixed with `/api`.
- Mongo via `MONGO_URL` + `DB_NAME`.
- Frontend uses `VITE_API_URL` (falls back to `REACT_APP_BACKEND_URL`).

## Three Order Channels + Business Rules
1. Home Delivery — free ≥ ₹199, else ₹30; +₹15 for `express_30min`.
2. Express Pickup — 5% discount, ₹30 confirmation, 4-digit OTP, live location tracking.
3. CL Order/Bulk — 5% commission auto-credited to CL wallet on delivery.

Coins: 50 first CL / 15 repeat CL / +5 rating bonus / +10 referral. 90-day expiry (max-of-current-and-new when re-earning). Min order ₹200, max 20% redemption per order.

## Referral System (Iter 2)
- Every customer auto-gets a `referralCode` (format `GRV[A-Z0-9]{4}`).
- `GET /api/referral/me` → { referralCode, shareUrl, referralCoinsPerFriend:10, stats }.
- `POST /api/referral/apply { referralCode }` → links user → referrer.
- On the referred user's FIRST order (any channel), referrer gets +10 coins (atomic compare-and-set on `firstOrderPlaced` to prevent double-credit under concurrency).

## Real-Time (SSE) (Iter 2)
- `GET /api/stream/orders/:id/stream?token=<customerJWT>` — per-order snapshot + `location` + `status` events.
- `GET /api/stream/admin/express-pickup/stream?token=<adminJWT>` — global feed for the Express Pickup Live board.
- Bus events: `LOCATION_UPDATE`, `ORDER_STATUS_CHANGED`, `ORDER_CREATED`, `PICKUP_ARRIVED`.
- 20s keep-alive; auto-cleanup on client disconnect.

## What's Implemented (Feb 2026)
- Iteration 1 (backend): full 3-channel orders, auth (customer/admin/CL), products/categories/pickup-points, coins/wallet, admin dashboard/reports, mock payment, QR tracking, ratings.
- Iteration 2 (backend): referral flow + SSE live streams; concurrency-safe first-order credit.
- Iteration 2 (frontend): Complete Admin Panel — Login, Dashboard, Products (list + form), Categories, Orders (list + detail with status change), Express Pickup Live (SSE-powered), Pickup Points CRUD, Users (list + detail with wallet credit), Community Leaders (approve/reject/suspend), Wallet search+credit, Reports (revenue bar, QR pie, Top products/CLs, CSV export).
- Data-testids present on every interactive element.

## Sidebar Navigation (10 items)
Dashboard · Products · Categories · Orders · Express Pickup · Pickup Points · Users · Community Leaders · Wallet · Reports + Logout.

## Backlog / Next Actions
- Real Firebase Phone Auth (interface compatible).
- Real Razorpay HMAC verify (code present, currently permissive in dev).
- Push notifications on order lifecycle.
- Customer-facing mobile app (React Native or PWA).
- CL dashboard/webapp UI.
