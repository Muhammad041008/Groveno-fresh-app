const Order = require('../models/Order');
const PickupPoint = require('../models/PickupPoint');
const User = require('../models/User');
const CommunityLeader = require('../models/CommunityLeader');
const CoinTransaction = require('../models/CoinTransaction');
const { asyncHandler, haversineKm } = require('../utils/helpers');

// Customer starts express pickup tracking
exports.startTracking = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (order.channel !== 'express_pickup') {
    return res.status(400).json({ success: false, message: 'Tracking only available for express pickup' });
  }
  order.trackingStartedAt = new Date();
  order.status = 'customer_on_way';
  await order.save();

  return res.json({
    success: true,
    hubLat: order.pickupPointLat,
    hubLng: order.pickupPointLng,
    hubAddress: order.pickupPointName,
    orderNumber: order.orderNumber,
    verificationCode: order.pickupOtp,
  });
});

exports.locationUpdate = asyncHandler(async (req, res) => {
  const { lat, lng, distanceToHub } = req.body;
  const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  const computedDist = distanceToHub !== undefined
    ? Number(distanceToHub)
    : haversineKm(lat, lng, order.pickupPointLat, order.pickupPointLng);

  order.locationPings.push({ lat, lng, distanceToHub: computedDist, ts: new Date() });
  // keep last 50 pings
  if (order.locationPings.length > 50) order.locationPings = order.locationPings.slice(-50);
  await order.save();

  return res.json({ success: true, distanceToHub: computedDist });
});

exports.arrived = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  order.status = 'arrived';
  order.arrivedAt = new Date();
  await order.save();
  return res.json({ success: true, order, verificationCode: order.pickupOtp });
});

// Admin/hub staff marks collected (with OTP verification)
exports.collected = asyncHandler(async (req, res) => {
  const { verificationCode } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (order.channel !== 'express_pickup') {
    return res.status(400).json({ success: false, message: 'Only express pickup orders can be collected' });
  }
  if (verificationCode && String(verificationCode) !== String(order.pickupOtp)) {
    return res.status(400).json({ success: false, message: 'Invalid verification code' });
  }
  order.status = 'collected';
  order.collectedAt = new Date();
  order.deliveredAt = order.deliveredAt || new Date();
  order.paymentStatus = order.paymentStatus === 'paid' ? 'paid' : 'paid';
  await creditCoinsIfCLOrder(order);
  await order.save();
  return res.json({ success: true, order });
});

// Helper - credit Groveno coins on CL-linked orders after delivery
async function creditCoinsIfCLOrder(order) {
  if (order.coinsCredited) return;
  if (!order.clId && !order.clCode) return;
  if (!order.userId) return;
  const user = await User.findById(order.userId);
  if (!user) return;
  const first = (user.clOrderCount || 0) === 0;
  const amount = first ? 50 : 15;
  const expiresAt = new Date(Date.now() + 90 * 24 * 3600 * 1000);
  user.coins = (user.coins || 0) + amount;
  user.coinsExpiresAt = expiresAt;
  user.clOrderCount = (user.clOrderCount || 0) + 1;
  await user.save();
  await CoinTransaction.create({
    userId: user._id, type: 'earn', amount, balanceAfter: user.coins,
    source: 'cl_order', orderId: order._id, expiresAt,
    description: first ? 'First CL order bonus' : 'CL repeat order bonus',
  });
  order.coinsEarned = amount;
  order.coinsCredited = true;
}

module.exports.creditCoinsIfCLOrder = creditCoinsIfCLOrder;
