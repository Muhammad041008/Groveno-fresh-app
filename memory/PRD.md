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

### Iteration 3 (CL Panel)
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
- Real Firebase Phone Auth + real Razorpay HMAC (interfaces compatible, code present).
- Push notifications on order lifecycle (out_for_delivery, arrived, delivered).
- Customer-facing mobile app (React Native or PWA).
- CL commission auto-payout via Razorpay Payouts (currently manual "Withdraw — coming soon").
- Product suggestions in Reports: consider Monday-based week aggregation for India (currently Sunday-based).
- Optional: server-side email/IFSC format validators on PUT /api/cl/profile.

## Public URLs
- App: https://delivery-coins.preview.emergentagent.com
- Admin: /login → /dashboard
- CL Panel: /cl/login → /cl/dashboard
