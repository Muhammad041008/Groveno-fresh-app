const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const Order = require('../models/Order');
const { asyncHandler } = require('../utils/helpers');

// Mock Razorpay: create order
exports.createOrder = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Positive amount is required' });
  const razorpayOrderId = 'order_' + uuidv4().replace(/-/g, '').slice(0, 14);
  return res.json({
    success: true,
    razorpayOrderId,
    amount: Math.round(amount * 100),
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock',
  });
});

// Mock verify - accepts any signature in dev
exports.verify = asyncHandler(async (req, res) => {
  const { razorpayOrderId, paymentId, signature, orderId } = req.body;
  if (!razorpayOrderId || !paymentId) {
    return res.status(400).json({ success: false, message: 'razorpayOrderId and paymentId are required' });
  }

  // In production: verify signature with HMAC-SHA256(order_id|payment_id, secret)
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'mock_secret')
    .update(`${razorpayOrderId}|${paymentId}`)
    .digest('hex');
  // Accept if signature matches OR we're in mock/dev
  const ok = signature === expected || process.env.NODE_ENV !== 'production';

  if (!ok) return res.status(400).json({ success: false, message: 'Invalid signature' });

  if (orderId) {
    const order = await Order.findOne({ _id: orderId, userId: req.user._id });
    if (order) {
      order.paymentStatus = 'paid';
      order.razorpayOrderId = razorpayOrderId;
      order.razorpayPaymentId = paymentId;
      order.razorpaySignature = signature || 'mock';
      await order.save();
    }
  }

  return res.json({ success: true, verified: true, mock: true });
});
