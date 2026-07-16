const Order = require('../models/Order');
const User = require('../models/User');
const CommunityLeader = require('../models/CommunityLeader');
const WalletTransaction = require('../models/WalletTransaction');
const CoinTransaction = require('../models/CoinTransaction');
const { asyncHandler } = require('../utils/helpers');
const { creditCoinsIfCLOrder } = require('./location.controller');

// Dashboard
exports.dashboard = asyncHandler(async (req, res) => {
  const [totalOrders, totalUsers, activeCLs] = await Promise.all([
    Order.countDocuments({}),
    User.countDocuments({}),
    CommunityLeader.countDocuments({ status: 'approved' }),
  ]);
  const revenueAgg = await Order.aggregate([
    { $match: { status: { $in: ['delivered', 'collected'] } } },
    { $group: { _id: null, total: { $sum: '$total' } } },
  ]);
  const revenue = revenueAgg?.[0]?.total || 0;

  const channelStatsAgg = await Order.aggregate([
    { $group: { _id: '$channel', count: { $sum: 1 }, revenue: { $sum: '$total' } } },
  ]);
  const channelStats = {};
  channelStatsAgg.forEach((c) => (channelStats[c._id] = { count: c.count, revenue: c.revenue }));

  return res.json({
    success: true,
    totalOrders,
    revenue,
    activeUsers: totalUsers,
    activeCLs,
    channelStats,
  });
});

// Orders list
exports.orders = asyncHandler(async (req, res) => {
  const { channel, status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (channel) filter.channel = channel;
  if (status) filter.status = status;
  const skip = (Number(page) - 1) * Number(limit);
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Order.countDocuments(filter),
  ]);
  return res.json({ success: true, orders, total, page: Number(page), limit: Number(limit) });
});

exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowed = ['placed', 'confirmed', 'packed', 'out_for_delivery', 'delivered',
    'ready_for_pickup', 'customer_on_way', 'arrived', 'collected', 'cancelled', 'rejected'];
  if (!allowed.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  order.status = status;
  if (status === 'delivered' || status === 'collected') {
    order.deliveredAt = order.deliveredAt || new Date();
    // Credit CL commission
    if (order.clId && !order.clCommissionCredited && order.clCommission > 0) {
      const cl = await CommunityLeader.findById(order.clId);
      if (cl) {
        cl.walletBalance = (cl.walletBalance || 0) + order.clCommission;
        cl.totalCommission = (cl.totalCommission || 0) + order.clCommission;
        cl.totalOrders = (cl.totalOrders || 0) + 1;
        await cl.save();
        await WalletTransaction.create({
          ownerType: 'cl', ownerId: cl._id, type: 'credit',
          amount: order.clCommission, balanceAfter: cl.walletBalance,
          source: 'cl_commission', orderId: order._id,
          description: `Commission for order ${order.orderNumber}`,
        });
        order.clCommissionCredited = true;
      }
    }
    // Credit customer coins on CL-linked orders
    await creditCoinsIfCLOrder(order);
  }
  if (status === 'cancelled') order.cancelledAt = new Date();
  await order.save();
  return res.json({ success: true, order });
});

// Users
exports.listUsers = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (search) filter.$or = [{ phone: { $regex: search } }, { name: { $regex: search, $options: 'i' } }];
  const skip = (Number(page) - 1) * Number(limit);
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    User.countDocuments(filter),
  ]);
  return res.json({ success: true, users, total, page: Number(page), limit: Number(limit) });
});

exports.getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  const orders = await Order.find({ userId: user._id }).sort({ createdAt: -1 }).limit(20);
  return res.json({ success: true, user, orders });
});

exports.creditUserWallet = asyncHandler(async (req, res) => {
  const { amount, description } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Positive amount required' });
  user.walletBalance = (user.walletBalance || 0) + Number(amount);
  await user.save();
  const txn = await WalletTransaction.create({
    ownerType: 'user', ownerId: user._id, type: 'credit', amount: Number(amount),
    balanceAfter: user.walletBalance, source: 'manual', description: description || 'Admin credit',
  });
  return res.json({ success: true, balance: user.walletBalance, transaction: txn });
});

// CLs
exports.listCLs = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  const skip = (Number(page) - 1) * Number(limit);
  const [cls, total] = await Promise.all([
    CommunityLeader.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    CommunityLeader.countDocuments(filter),
  ]);
  return res.json({ success: true, cls, total, page: Number(page), limit: Number(limit) });
});

exports.approveCL = asyncHandler(async (req, res) => {
  const { action = 'approve' } = req.body || {};
  const cl = await CommunityLeader.findById(req.params.id);
  if (!cl) return res.status(404).json({ success: false, message: 'CL not found' });
  cl.status = action === 'reject' ? 'rejected' : action === 'suspend' ? 'suspended' : 'approved';
  await cl.save();
  return res.json({ success: true, cl });
});

// Live express pickup with location
exports.expressPickupActive = asyncHandler(async (req, res) => {
  const active = await Order.find({
    channel: 'express_pickup',
    status: { $in: ['confirmed', 'customer_on_way', 'arrived', 'ready_for_pickup'] },
  }).sort({ createdAt: -1 }).limit(50);
  return res.json({ success: true, orders: active });
});

// Reports
exports.revenueReport = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const match = { status: { $in: ['delivered', 'collected'] } };
  if (from || to) {
    match.deliveredAt = {};
    if (from) match.deliveredAt.$gte = new Date(from);
    if (to) match.deliveredAt.$lte = new Date(to);
  }
  const agg = await Order.aggregate([
    { $match: match },
    { $group: {
      _id: '$channel',
      orders: { $sum: 1 },
      revenue: { $sum: '$total' },
      itemsRevenue: { $sum: '$itemsTotal' },
    } },
  ]);
  const totalRevenue = agg.reduce((a, x) => a + x.revenue, 0);
  return res.json({ success: true, totalRevenue, byChannel: agg });
});

exports.qrAnalytics = asyncHandler(async (req, res) => {
  const cls = await CommunityLeader.find({}, 'name clCode societyName qrScans totalOrders').lean();
  const totals = { poster: 0, whatsapp: 0, standee: 0, other: 0 };
  cls.forEach((c) => {
    const q = c.qrScans || {};
    totals.poster += q.poster || 0;
    totals.whatsapp += q.whatsapp || 0;
    totals.standee += q.standee || 0;
    totals.other += q.other || 0;
  });
  return res.json({ success: true, totals, cls });
});
