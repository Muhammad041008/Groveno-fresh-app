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

// GET /api/cl/me
exports.me = asyncHandler(async (req, res) => {
  return res.json({ success: true, cl: req.cl });
});

// PUT /api/cl/profile — name, email, bank details
exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, email, bankDetails } = req.body;
  if (name !== undefined) req.cl.name = name;
  if (email !== undefined) req.cl.email = String(email).toLowerCase();
  if (bankDetails && typeof bankDetails === 'object') {
    req.cl.bankDetails = {
      accountHolder: bankDetails.accountHolder ?? req.cl.bankDetails?.accountHolder ?? '',
      accountNumber: bankDetails.accountNumber ?? req.cl.bankDetails?.accountNumber ?? '',
      ifsc: bankDetails.ifsc ?? req.cl.bankDetails?.ifsc ?? '',
      bankName: bankDetails.bankName ?? req.cl.bankDetails?.bankName ?? '',
    };
  }
  await req.cl.save();
  return res.json({ success: true, cl: req.cl });
});

// POST /api/cl/change-password
exports.changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.status(400).json({ success: false, message: 'oldPassword and newPassword required' });
  if (newPassword.length < 6) return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
  const ok = await req.cl.comparePassword(oldPassword);
  if (!ok) return res.status(400).json({ success: false, message: 'Incorrect current password' });
  await req.cl.setPassword(newPassword);
  await req.cl.save();
  return res.json({ success: true, message: 'Password updated' });
});

// GET /api/cl/earnings — summary + history
exports.earnings = asyncHandler(async (req, res) => {
  const cl = req.cl;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [today, week, month] = await Promise.all([
    Order.aggregate([
      { $match: { clId: cl._id, clCommissionCredited: true, deliveredAt: { $gte: startOfDay } } },
      { $group: { _id: null, commission: { $sum: '$clCommission' }, orders: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { clId: cl._id, clCommissionCredited: true, deliveredAt: { $gte: startOfWeek } } },
      { $group: { _id: null, commission: { $sum: '$clCommission' }, orders: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { clId: cl._id, clCommissionCredited: true, deliveredAt: { $gte: startOfMonth } } },
      { $group: { _id: null, commission: { $sum: '$clCommission' }, orders: { $sum: 1 } } },
    ]),
  ]);

  const history = await Order.find({ clId: cl._id, clCommissionCredited: true })
    .sort({ deliveredAt: -1 })
    .limit(100)
    .select('orderNumber itemsTotal total clCommission deliveredAt createdAt');

  return res.json({
    success: true,
    summary: {
      allTime: cl.totalCommission || 0,
      thisMonth: month?.[0]?.commission || 0,
      thisWeek: week?.[0]?.commission || 0,
      today: today?.[0]?.commission || 0,
      walletBalance: cl.walletBalance || 0,
      totalOrders: cl.totalOrders || 0,
    },
    commissionRate: 0.05,
    history,
  });
});
