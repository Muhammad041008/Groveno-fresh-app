const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const CommunityLeader = require('../models/CommunityLeader');
const PickupPoint = require('../models/PickupPoint');
const CoinTransaction = require('../models/CoinTransaction');
const {
  asyncHandler,
  generateOrderNumber,
  generatePickupOtp,
  haversineKm,
} = require('../utils/helpers');
const { maybeCreditReferrer } = require('./referral.controller');
const { bus, EVENTS } = require('../utils/eventBus');

// ==== Constants (business rules) ====
const FREE_DELIVERY_THRESHOLD = 199;
const DELIVERY_FEE = 30;
const EXPRESS_30MIN_FEE = 15;
const PICKUP_CONFIRMATION_FEE = 30;
const PICKUP_DISCOUNT_PCT = 0.05; // 5%
const CL_COMMISSION_PCT = 0.05;   // 5%
const COIN_VALUE = 1;             // 1 coin = ₹1
const COIN_MAX_PCT = 0.20;        // max 20% of order
const COIN_MIN_ORDER = 200;
const COIN_EXPIRY_DAYS = 90;
const COIN_FIRST_CL = 50;
const COIN_REPEAT_CL = 15;
const COIN_RATING_BONUS = 5;

// ---- Utilities ----
async function expandItems(rawItems) {
  // rawItems: [{ productId, variantId | variantSize, quantity }]
  if (!Array.isArray(rawItems) || !rawItems.length) throw Object.assign(new Error('Items required'), { status: 400 });
  const productIds = [...new Set(rawItems.map((i) => i.productId))];
  const products = await Product.find({ _id: { $in: productIds }, isActive: true });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const items = [];
  let itemsTotal = 0;
  for (const it of rawItems) {
    const p = productMap.get(String(it.productId));
    if (!p) throw Object.assign(new Error(`Product not found: ${it.productId}`), { status: 400 });
    let variant = null;
    if (it.variantId) variant = p.variants.id(it.variantId);
    if (!variant && it.variantSize) variant = p.variants.find((v) => v.size === it.variantSize);
    if (!variant) variant = p.variants[0];
    if (!variant) throw Object.assign(new Error(`No variant for product ${p.name}`), { status: 400 });

    const qty = Math.max(1, Number(it.quantity) || 1);
    const subtotal = variant.price * qty;
    itemsTotal += subtotal;

    items.push({
      productId: p._id,
      name: p.name,
      image: p.images?.[0] || '',
      variantId: variant._id,
      variantSize: variant.size,
      variantLabel: variant.label,
      price: variant.price,
      mrp: variant.mrp,
      quantity: qty,
      subtotal,
      // Denormalise category from the trusted Product document.
      // p.category is the ObjectId; p.categoryName is the string stored on the Product.
      categoryId: p.category ?? null,
      categoryName: p.categoryName || '',
    });
  }
  return { items, itemsTotal };
}

function computeCoinsRedemption(user, coinsRequested, orderTotal) {
  if (!coinsRequested || coinsRequested <= 0) return { coinsUsed: 0, coinsValue: 0 };
  if (orderTotal < COIN_MIN_ORDER) return { coinsUsed: 0, coinsValue: 0 };
  const now = new Date();
  if (user.coinsExpiresAt && user.coinsExpiresAt < now) return { coinsUsed: 0, coinsValue: 0 };
  const maxByBalance = Math.min(user.coins || 0, coinsRequested);
  const maxByPct = Math.floor(orderTotal * COIN_MAX_PCT / COIN_VALUE);
  const coinsUsed = Math.max(0, Math.min(maxByBalance, maxByPct));
  return { coinsUsed, coinsValue: coinsUsed * COIN_VALUE };
}

// ==== Channel 1: Home Delivery ====
exports.homeDelivery = asyncHandler(async (req, res) => {
  const {
    items: rawItems,
    address,
    deliverySlot = 'morning',      // morning | evening | express_30min
    deliveryDate,
    clCode = null,
    coinsToUse = 0,
    paymentMethod = 'cod',
  } = req.body;

  if (!address || !address.line1 || !address.pincode) {
    return res.status(400).json({ success: false, message: 'Delivery address is required' });
  }

  const { items, itemsTotal } = await expandItems(rawItems);
  let deliveryFee = itemsTotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  let expressCharge = deliverySlot === 'express_30min' ? EXPRESS_30MIN_FEE : 0;

  // Optional CL reference (customer places order but tags a CL for reward tracking)
  let cl = null;
  if (clCode) {
    cl = await CommunityLeader.findOne({ clCode: clCode.toUpperCase(), status: 'approved' });
    if (!cl) return res.status(400).json({ success: false, message: 'Invalid CL code' });
  }

  // Coins
  const preTotal = itemsTotal + deliveryFee + expressCharge;
  const { coinsUsed, coinsValue } = computeCoinsRedemption(req.user, Number(coinsToUse) || 0, preTotal);

  const total = Math.max(0, preTotal - coinsValue);

  const orderNumber = await generateOrderNumber();

  const order = await Order.create({
    orderNumber,
    channel: 'home_delivery',
    status: 'placed',
    userId: req.user._id,
    userName: req.user.name || '',
    userPhone: req.user.phone,
    clId: cl?._id || null,
    clCode: cl?.clCode || null,
    items,
    itemsTotal,
    deliveryFee,
    expressCharge,
    coinsUsed,
    coinsValue,
    total,
    address,
    deliverySlot,
    deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
    paymentMethod,
    paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
    clCommission: cl ? Number((itemsTotal * CL_COMMISSION_PCT).toFixed(2)) : 0,
  });

  // Debit coins immediately (mark as used)
  if (coinsUsed > 0) {
    req.user.coins -= coinsUsed;
    await req.user.save();
    await CoinTransaction.create({
      userId: req.user._id, type: 'redeem', amount: coinsUsed,
      balanceAfter: req.user.coins, source: 'redemption', orderId: order._id,
      description: `Redeemed on order ${order.orderNumber}`,
    });
  }

  // Referral reward: if this is the user's first order, credit referrer
  await maybeCreditReferrer(req.user, order);

  bus.emit(EVENTS.ORDER_CREATED, { order });

  return res.status(201).json({ success: true, order });
});

// ==== Channel 2: Express Pickup ====
exports.expressPickup = asyncHandler(async (req, res) => {
  const {
    items: rawItems,
    pickupPointId,
    pickupTime,
    coinsToUse = 0,
    paymentMethod = 'online',
  } = req.body;

  if (!pickupPointId) return res.status(400).json({ success: false, message: 'pickupPointId is required' });
  const pp = await PickupPoint.findById(pickupPointId);
  if (!pp || !pp.isActive) return res.status(400).json({ success: false, message: 'Invalid pickup point' });

  const { items, itemsTotal } = await expandItems(rawItems);

  const pickupDiscount = Number((itemsTotal * PICKUP_DISCOUNT_PCT).toFixed(2));
  const expressCharge = PICKUP_CONFIRMATION_FEE;
  const preTotal = itemsTotal + expressCharge - pickupDiscount;

  const { coinsUsed, coinsValue } = computeCoinsRedemption(req.user, Number(coinsToUse) || 0, preTotal);

  const total = Math.max(0, preTotal - coinsValue);

  const orderNumber = await generateOrderNumber();
  const pickupOtp = generatePickupOtp();

  const order = await Order.create({
    orderNumber,
    channel: 'express_pickup',
    status: 'confirmed',
    userId: req.user._id,
    userName: req.user.name || '',
    userPhone: req.user.phone,
    items,
    itemsTotal,
    deliveryFee: 0,
    expressCharge,
    pickupDiscount,
    coinsUsed,
    coinsValue,
    total,
    pickupPointId: pp._id,
    pickupPointName: pp.name,
    pickupPointLat: pp.lat,
    pickupPointLng: pp.lng,
    pickupTime: pickupTime || '',
    pickupOtp,
    paymentMethod,
    paymentStatus: 'pending',
  });

  if (coinsUsed > 0) {
    req.user.coins -= coinsUsed;
    await req.user.save();
    await CoinTransaction.create({
      userId: req.user._id, type: 'redeem', amount: coinsUsed,
      balanceAfter: req.user.coins, source: 'redemption', orderId: order._id,
      description: `Redeemed on order ${order.orderNumber}`,
    });
  }

  // Referral reward + broadcast
  await maybeCreditReferrer(req.user, order);
  bus.emit(EVENTS.ORDER_CREATED, { order });

  return res.status(201).json({
    success: true,
    order,
    pickupHub: { lat: pp.lat, lng: pp.lng, name: pp.name, address: pp.address },
    verificationCode: pickupOtp,
  });
});

// ==== Channel 3: CL single order ====
exports.clOrder = asyncHandler(async (req, res) => {
  const cl = req.cl;
  const { customerName, items: rawItems, address } = req.body;

  if (!customerName) return res.status(400).json({ success: false, message: 'customerName is required' });
  if (!address || !address.line1) return res.status(400).json({ success: false, message: 'Delivery address is required' });

  const { items, itemsTotal } = await expandItems(rawItems);
  const deliveryFee = itemsTotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const total = itemsTotal + deliveryFee;
  const commission = Number((itemsTotal * CL_COMMISSION_PCT).toFixed(2));

  const orderNumber = await generateOrderNumber();

  const order = await Order.create({
    orderNumber,
    channel: 'cl_order',
    status: 'placed',
    clId: cl._id,
    clCode: cl.clCode,
    customerName,
    userName: customerName,
    userPhone: address.phone || '',
    items,
    itemsTotal,
    deliveryFee,
    total,
    address,
    paymentMethod: 'cod',
    paymentStatus: 'pending',
    clCommission: commission,
  });

  return res.status(201).json({ success: true, order });
});

// ==== Channel 3b: CL bulk orders ====
exports.clBulk = asyncHandler(async (req, res) => {
  const cl = req.cl;
  const { orders = [] } = req.body;
  if (!Array.isArray(orders) || !orders.length) {
    return res.status(400).json({ success: false, message: 'orders array is required' });
  }
  const created = [];
  for (const o of orders) {
    const { items, itemsTotal } = await expandItems(o.items);
    const deliveryFee = itemsTotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
    const total = itemsTotal + deliveryFee;
    const commission = Number((itemsTotal * CL_COMMISSION_PCT).toFixed(2));
    const orderNumber = await generateOrderNumber();
    const doc = await Order.create({
      orderNumber, channel: 'cl_order', status: 'placed',
      clId: cl._id, clCode: cl.clCode,
      customerName: o.customerName, userName: o.customerName, userPhone: o.address?.phone || '',
      items, itemsTotal, deliveryFee, total,
      address: o.address,
      paymentMethod: 'cod', paymentStatus: 'pending',
      clCommission: commission,
    });
    created.push(doc);
  }
  return res.status(201).json({ success: true, count: created.length, orders: created });
});

// ==== Customer order queries ====
exports.myOrders = asyncHandler(async (req, res) => {
  const { status, channel, page = 1, limit = 20 } = req.query;
  const filter = { userId: req.user._id };
  if (status) filter.status = status;
  if (channel) filter.channel = channel;
  const skip = (Number(page) - 1) * Number(limit);
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Order.countDocuments(filter),
  ]);
  return res.json({ success: true, orders, total, page: Number(page), limit: Number(limit) });
});

exports.getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  return res.json({ success: true, order });
});

exports.pendingRating = asyncHandler(async (req, res) => {
  const orders = await Order.find({
    userId: req.user._id,
    status: { $in: ['delivered', 'collected'] },
    ratingStatus: { $in: ['not_prompted', 'pending'] },
    ratingSkipCount: { $lt: 3 },
  }).sort({ deliveredAt: -1 }).limit(5);
  return res.json({ success: true, orders });
});

exports.rateOrder = asyncHandler(async (req, res) => {
  const { ratings } = req.body;
  const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (!['delivered', 'collected'].includes(order.status)) {
    return res.status(400).json({ success: false, message: 'Only delivered orders can be rated' });
  }
  if (!Array.isArray(ratings) || !ratings.length) return res.status(400).json({ success: false, message: 'ratings required' });

  order.ratings = ratings.map((r) => ({ productId: r.productId, stars: Number(r.stars), review: r.review || '' }));
  order.ratingStatus = 'rated';

  // Push ratings into products
  for (const r of ratings) {
    const p = await Product.findById(r.productId);
    if (!p) continue;
    p.ratings.push({ userId: req.user._id, orderId: order._id, stars: Number(r.stars), review: r.review || '' });
    p.recomputeRating();
    await p.save();
  }

  // Rating bonus coins for CL-linked orders
  if (order.channel === 'cl_order' || order.clId) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + COIN_EXPIRY_DAYS * 24 * 3600 * 1000);
    req.user.coins = (req.user.coins || 0) + COIN_RATING_BONUS;
    req.user.coinsExpiresAt = expiresAt;
    await req.user.save();
    await CoinTransaction.create({
      userId: req.user._id, type: 'earn', amount: COIN_RATING_BONUS,
      balanceAfter: req.user.coins, source: 'rating', orderId: order._id,
      expiresAt, description: `Rating bonus for ${order.orderNumber}`,
    });
  }

  await order.save();
  return res.json({ success: true, order, coinsEarned: (order.channel === 'cl_order' || order.clId) ? COIN_RATING_BONUS : 0 });
});

exports.skipRating = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, userId: req.user._id });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  order.ratingSkipCount = (order.ratingSkipCount || 0) + 1;
  order.ratingStatus = order.ratingSkipCount >= 3 ? 'skipped' : 'pending';
  await order.save();

  req.user.ratingSkipCount = (req.user.ratingSkipCount || 0) + 1;
  await req.user.save();

  return res.json({ success: true, order });
});
