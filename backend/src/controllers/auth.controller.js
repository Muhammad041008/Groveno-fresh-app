const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { asyncHandler } = require('../utils/helpers');
const { ensureReferralCode } = require('./referral.controller');

// In-memory OTP store for dev. Firebase Phone Auth compatible interface.
const otpStore = new Map(); // phone -> { otp, expiresAt }

function issueCustomerToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: 'customer', phone: user.phone },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
}

exports.sendOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  if (!phone || !/^\+?\d{10,15}$/.test(phone)) {
    return res.status(400).json({ success: false, message: 'Valid phone number is required' });
  }
  const otp = process.env.MOCK_OTP || '123456';
  const expiresAt = Date.now() + 5 * 60 * 1000;
  otpStore.set(phone, { otp, expiresAt });

  return res.json({
    success: true,
    message: 'OTP sent successfully',
    // In dev, return the OTP for easy testing. In prod, remove this.
    devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    expiresIn: 300,
  });
});

exports.verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ success: false, message: 'Phone and OTP are required' });
  }

  // Accept the MOCK_OTP or the stored OTP (whichever matches). Firebase mode will replace this.
  const record = otpStore.get(phone);
  const mock = process.env.MOCK_OTP || '123456';
  const validOtp = otp === mock || (record && record.otp === otp && record.expiresAt > Date.now());

  if (!validOtp) {
    return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
  }
  otpStore.delete(phone);

  let user = await User.findOne({ phone });
  let isNew = false;
  if (!user) {
    user = new User({ phone });
    await user.save();
    isNew = true;
  }
  user.lastLoginAt = new Date();
  await user.save();
  // Ensure user has a referral code
  await ensureReferralCode(user);

  const token = issueCustomerToken(user);

  return res.json({
    success: true,
    message: isNew ? 'Signup successful' : 'Login successful',
    token,
    user,
    isNewUser: isNew,
  });
});

exports.me = asyncHandler(async (req, res) => {
  return res.json({ success: true, user: req.user });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  if (name !== undefined) req.user.name = name;
  if (email !== undefined) req.user.email = email;
  await req.user.save();
  return res.json({ success: true, user: req.user });
});

exports.addAddress = asyncHandler(async (req, res) => {
  const { label, line1, line2, city, state, pincode, landmark, lat, lng, isDefault } = req.body;
  if (!line1 || !city || !pincode) {
    return res.status(400).json({ success: false, message: 'line1, city and pincode are required' });
  }
  const addr = { label: label || 'Home', line1, line2, city, state, pincode, landmark, lat, lng, isDefault: !!isDefault };
  if (addr.isDefault) req.user.addresses.forEach((a) => (a.isDefault = false));
  if (req.user.addresses.length === 0) addr.isDefault = true;
  req.user.addresses.push(addr);
  await req.user.save();
  return res.json({ success: true, addresses: req.user.addresses });
});
