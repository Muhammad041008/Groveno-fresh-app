const jwt = require('jsonwebtoken');
const Order = require('../models/Order');
const Admin = require('../models/Admin');
const User = require('../models/User');
const { bus, EVENTS } = require('../utils/eventBus');

// Helper: standard SSE setup
function setupSSE(req, res) {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // disable proxy buffering
  });
  res.flushHeaders?.();
  // Send an initial comment to open the stream
  res.write(': connected\n\n');

  // Keep-alive ping every 20s
  const keepAlive = setInterval(() => {
    try { res.write(': ping\n\n'); } catch (_) {}
  }, 20000);

  req.on('close', () => {
    clearInterval(keepAlive);
    try { res.end(); } catch (_) {}
  });

  return {
    send(event, data) {
      try {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (_) {}
    },
    close() {
      clearInterval(keepAlive);
      try { res.end(); } catch (_) {}
    },
  };
}

// Token via ?token= query param (EventSource cannot set headers)
async function verifyToken(token, secret) {
  if (!token) return null;
  try { return jwt.verify(token, secret); } catch { return null; }
}

// ==== Customer stream: single order location + status ====
exports.customerOrderStream = async (req, res) => {
  const { token } = req.query;
  const decoded = await verifyToken(token, process.env.JWT_SECRET);
  if (!decoded || decoded.role !== 'customer') return res.status(401).json({ success: false, message: 'Unauthorized' });

  const user = await User.findById(decoded.id);
  if (!user) return res.status(401).json({ success: false, message: 'User not found' });

  const order = await Order.findOne({ _id: req.params.id, userId: user._id });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  const sse = setupSSE(req, res);
  sse.send('snapshot', { order });

  const onLocation = (p) => { if (p.orderId === order._id.toString()) sse.send('location', p); };
  const onStatus = (p) => { if (p.orderId === order._id.toString()) sse.send('status', p); };
  bus.on(EVENTS.LOCATION_UPDATE, onLocation);
  bus.on(EVENTS.ORDER_STATUS_CHANGED, onStatus);

  req.on('close', () => {
    bus.off(EVENTS.LOCATION_UPDATE, onLocation);
    bus.off(EVENTS.ORDER_STATUS_CHANGED, onStatus);
  });
};

// ==== Admin stream: all active express pickup activity ====
exports.adminExpressStream = async (req, res) => {
  const { token } = req.query;
  const decoded = await verifyToken(token, process.env.JWT_ADMIN_SECRET);
  if (!decoded || decoded.role !== 'admin') return res.status(401).json({ success: false, message: 'Unauthorized' });
  const admin = await Admin.findById(decoded.id);
  if (!admin) return res.status(401).json({ success: false, message: 'Admin not found' });

  const sse = setupSSE(req, res);

  // Initial snapshot
  const active = await Order.find({
    channel: 'express_pickup',
    status: { $in: ['confirmed', 'customer_on_way', 'arrived', 'ready_for_pickup'] },
  }).sort({ createdAt: -1 }).limit(50);
  sse.send('snapshot', { orders: active });

  const onLocation = (p) => sse.send('location', p);
  const onStatus = (p) => {
    if (p.order?.channel === 'express_pickup' || p.order?.channel === undefined) sse.send('status', p);
  };
  const onArrived = (p) => sse.send('arrived', p);
  const onCreated = (p) => { if (p.order?.channel === 'express_pickup') sse.send('created', p); };

  bus.on(EVENTS.LOCATION_UPDATE, onLocation);
  bus.on(EVENTS.ORDER_STATUS_CHANGED, onStatus);
  bus.on(EVENTS.PICKUP_ARRIVED, onArrived);
  bus.on(EVENTS.ORDER_CREATED, onCreated);

  req.on('close', () => {
    bus.off(EVENTS.LOCATION_UPDATE, onLocation);
    bus.off(EVENTS.ORDER_STATUS_CHANGED, onStatus);
    bus.off(EVENTS.PICKUP_ARRIVED, onArrived);
    bus.off(EVENTS.ORDER_CREATED, onCreated);
  });
};
