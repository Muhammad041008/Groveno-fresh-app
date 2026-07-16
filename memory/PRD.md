# Groveno Fresh - Product Requirements Document

## Original Problem Statement
Groveno Fresh - a community grocery delivery app with 3 order channels.
Complete production-ready Node.js backend (Express + MongoDB + JWT).

## Tech Stack
- Node.js 20 + Express 4
- MongoDB via Mongoose 8
- JWT (separate secrets: customer / admin / CL)
- bcryptjs, cors, dotenv, helmet, morgan
- uuid (order IDs), firebase-admin (mock), razorpay (mock)

## Architecture
- Supervisor runs `node server.js` on 0.0.0.0:8001
- All routes prefixed with `/api`
- Mongo via `MONGO_URL` + `DB_NAME` (never hardcoded)

## Three Order Channels
1. **Home Delivery** — morning/evening/express_30min slots. Free above ₹199, else ₹30. Express 30-min adds ₹15.
2. **Express Pickup** — ₹30 confirmation, 5% discount, order ID (OTP) verification, live location tracking (haversine hub distance).
3. **CL Order** — Community Leader places bulk order for customer; 5% commission auto-credited on delivery.

## Business Rules
- Order numbers: `GRV-<YEAR>-00001` via atomic Counter
- Groveno Coins: 50 first CL order, 15 repeat, +5 rating bonus
- Coins expire 90 days, max 20% redemption, min order ₹200
- Rating popup: up to 3 skips before auto-dismiss

## What's Implemented (Feb 2026)
- Full backend under `/app/backend` (Node.js), FastAPI removed
- Models: User, Admin, Product, Category, Order, PickupPoint, CommunityLeader, WalletTransaction, CoinTransaction, Counter
- Controllers: auth, adminAuth, cl (register/login/dashboard/orders/deliver), product, order (3 channels + rating + skip), location tracking, wallet, coins, admin, payment (mock razorpay), qr tracking
- Middlewares: auth (customer JWT), adminAuth, clAuth, errorHandler
- Seeder: 1 admin, 5 categories, 10 products (with 3 variants each), 2 pickup points, 1 CL

## Backlog (P1)
- Firebase Phone Auth real integration (interface ready)
- Real Razorpay verification (HMAC signature logic present, currently permissive in dev)
- Push notifications on order status changes
- Frontend (React app)

## Auth Endpoints Summary
- Customer OTP: send-otp/verify-otp (mock OTP: 123456)
- Admin: admin@groveno.com / Admin@123
- CL: cl@groveno.com / CL@123 (code CL12345)
