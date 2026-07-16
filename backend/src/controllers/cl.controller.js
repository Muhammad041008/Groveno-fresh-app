const jwt = require('jsonwebtoken');
const CommunityLeader = require('../models/CommunityLeader');
const Order = require('../models/Order');
const WalletTransaction = require('../models/WalletTransaction');
const { asyncHandler, generateCLCode } = require('../utils/helpers');

function issueCLToken(cl) {
  return jwt.sign(
    { id: cl._id.toString(), role: 'cl', clCode: cl.clCode },
    process.env.JWT_CL_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
}

exports.register = asyncHandler(async (req, res) => {
  const { name, phone, email, password, societyName } = req.body;
  if (!name || !phone || !email || !password || !societyName) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }
  const exists = await CommunityLeader.findOne({ $or: [{ email: email.toLowerCase() }, { phone }] });
  if (exists) return res.status(409).json({ success: false, message: 'CL already exists with this email or phone' });

  // Ensure unique CL code
  let clCode;
  for (let i = 0; i < 5; i++) {
    clCode = generateCLCode();
    const dup = await CommunityLeader.findOne({ clCode });
    if (!dup) break;
  }

  const cl = new CommunityLeader({
    name, phone, email: email.toLowerCase(),
    societyName, clCode, status: 'pending',
  });
  await cl.setPassword(password);
  await cl.save();

  return res.status(201).json({
    success: true,
    message: 'CL registered. Waiting for admin approval.',
    cl,
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });
  const cl = await CommunityLeader.findOne({ email: email.toLowerCase() });
  if (!cl) return res.status(401).json({ success: false, message: 'Invalid credentials' });
  const ok = await cl.comparePassword(password);
  if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });
  if (cl.status !== 'approved') {
    return res.status(403).json({ success: false, message: `Account status: ${cl.status}. Please wait for approval.` });
  }
  const token = issueCLToken(cl);
  return res.json({ success: true, token, cl });
});

// Public: validate CL code
exports.validateCode = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const cl = await CommunityLeader.findOne({ clCode: (code || '').toUpperCase(), status: 'approved' });
  if (!cl) return res.json({ valid: false });
  return res.json({ valid: true, clName: cl.name, society: cl.societyName, clCode: cl.clCode });
});

// CL dashboard
exports.dashboard = asyncHandler(async (req, res) => {
  const cl = req.cl;
  const [totalOrders, deliveredOrders, pendingOrders] = await Promise.all([
    Order.countDocuments({ clId: cl._id }),
    Order.countDocuments({ clId: cl._id, status: { $in: ['delivered', 'collected'] } }),
    Order.countDocuments({ clId: cl._id, status: { $nin: ['delivered', 'collected', 'cancelled', 'rejected'] } }),
  ]);

  const recent = await Order.find({ clId: cl._id }).sort({ createdAt: -1 }).limit(10);

  return res.json({
    success: true,
    cl,
    stats: {
      totalOrders,
      deliveredOrders,
      pendingOrders,
      totalCommission: cl.totalCommission,
      walletBalance: cl.walletBalance,
      qrScans: cl.qrScans,
    },
    recentOrders: recent,
  });
});

exports.myOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = { clId: req.cl._id };
  if (status) filter.status = status;
  const skip = (Number(page) - 1) * Number(limit);
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Order.countDocuments(filter),
  ]);
  return res.json({ success: true, orders, total, page: Number(page), limit: Number(limit) });
});

// CL marks order delivered → triggers commission
exports.markDelivered = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, clId: req.cl._id });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (order.status === 'delivered') return res.json({ success: true, order });

  order.status = 'delivered';
  order.deliveredAt = new Date();

  // Credit commission
  if (!order.clCommissionCredited && order.clCommission > 0) {
    const cl = await CommunityLeader.findById(order.clId);
    cl.walletBalance = (cl.walletBalance || 0) + order.clCommission;
    cl.totalCommission = (cl.totalCommission || 0) + order.clCommission;
    cl.totalOrders = (cl.totalOrders || 0) + 1;
    await cl.save();
    await WalletTransaction.create({
      ownerType: 'cl',
      ownerId: cl._id,
      type: 'credit',
      amount: order.clCommission,
      balanceAfter: cl.walletBalance,
      source: 'cl_commission',
      orderId: order._id,
      description: `Commission for order ${order.orderNumber}`,
    });
    order.clCommissionCredited = true;
  }

  await order.save();
  return res.json({ success: true, order });
});
