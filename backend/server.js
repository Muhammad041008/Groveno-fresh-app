require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./src/config/db');
const errorHandler = require('./src/middleware/errorHandler');

// Route imports
const authRoutes = require('./src/routes/auth.routes');
const adminAuthRoutes = require('./src/routes/adminAuth.routes');
const clAuthRoutes = require('./src/routes/clAuth.routes');
const productRoutes = require('./src/routes/product.routes');
const orderRoutes = require('./src/routes/order.routes');
const clRoutes = require('./src/routes/cl.routes');
const adminRoutes = require('./src/routes/admin.routes');
const walletRoutes = require('./src/routes/wallet.routes');
const coinsRoutes = require('./src/routes/coins.routes');
const paymentRoutes = require('./src/routes/payment.routes');
const qrRoutes = require('./src/routes/qr.routes');
const referralRoutes = require('./src/routes/referral.routes');
const streamRoutes = require('./src/routes/stream.routes');

const app = express();

// Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: (process.env.CORS_ORIGINS || '*') === '*' ? true : (process.env.CORS_ORIGINS || '*').split(','), credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health
app.get('/api/', (req, res) => res.json({ ok: true, service: 'Groveno Fresh API', version: '1.0.0' }));
app.get('/api/health', (req, res) => res.json({ status: 'healthy', ts: new Date().toISOString() }));

// Routes - IMPORTANT: all under /api prefix (kubernetes ingress rule)
app.use('/api/auth', authRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/cl/auth', clAuthRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', require('./src/routes/category.routes'));
app.use('/api/pickup-points', require('./src/routes/pickup.routes'));
app.use('/api/orders', orderRoutes);
app.use('/api/cl', clRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/coins', coinsRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/stream', streamRoutes);

// 404
app.use('/api/*', (req, res) => res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` }));

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 8001;

connectDB()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Groveno] Server running on http://0.0.0.0:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[Groveno] Failed to start:', err);
    process.exit(1);
  });

module.exports = app;
