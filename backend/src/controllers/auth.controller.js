const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { asyncHandler } = require('../utils/helpers');
const { ensureReferralCode } = require('./referral.controller');
const { getFirebaseAdmin, admin } = require('../utils/firebaseAdmin');

// In-memory OTP store for dev / mock mode
const otpStore = new Map(); // phone -> { otp, expiresAt }

const DEMO_PHONE = '+911234567890';
const DEMO_OTP = '1234';

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

  const normalised = phone.startsWith('+') ? phone : `+91${phone}`;

  // Demo phone — no real OTP needed
  if (normalised === DEMO_PHONE) {
    return res.json({ success: true, message: 'Demo OTP is 1234', devOtp: '1234', expiresIn: 300 });
  }

  const otp = process.env.MOCK_OTP || '123456';
  const expiresAt = Date.now() + 5 * 60 * 1000;
  otpStore.set(normalised, { otp, expiresAt });

  return res.json({
    success: true,
    message: 'OTP sent successfully',
    devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    expiresIn: 300,
  });
});

exports.verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp, firebaseToken } = req.body;

  let verifiedPhone = null;

  if (firebaseToken) {
    // ── Firebase path ──────────────────────────────────────────────
    const firebaseApp = getFirebaseAdmin();
    if (!firebaseApp) {
      return res.status(503).json({
        success: false,
        message: 'Firebase is not configured on the server. Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY to .env',
      });
    }
    try {
      const decoded = await admin.auth(firebaseApp).verifyIdToken(firebaseToken);
      verifiedPhone = decoded.phone_number;
      if (!verifiedPhone) {
        return res.status(400).json({ success: false, message: 'Phone number missing from Firebase token' });
      }
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired Firebase token' });
    }
  } else if (otp) {
    // ── Mock / legacy path ─────────────────────────────────────────
    if (!phone) return res.status(400).json({ success: false, message: 'phone is required' });

    const normalised = phone.startsWith('+') ? phone : `+91${phone}`;

    // Demo shortcut: +911234567890 with OTP 1234
    if (normalised === DEMO_PHONE && otp === DEMO_OTP) {
      verifiedPhone = DEMO_PHONE;
    } else {
      const record = otpStore.get(normalised);
      const mock = process.env.MOCK_OTP || '123456';
      const valid =
        otp === mock ||
        (record && record.otp === otp && record.expiresAt > Date.now());
      if (!valid) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      }
      otpStore.delete(normalised);
      verifiedPhone = normalised;
    }
  } else {
    return res.status(400).json({ success: false, message: 'Provide either firebaseToken or otp' });
  }

  // ── Find or register user ────────────────────────────────────────
  let user = await User.findOne({ phone: verifiedPhone });
  let isNew = false;
  if (!user) {
    user = new User({ phone: verifiedPhone });
    await user.save();
    isNew = true;
  }
  user.lastLoginAt = new Date();
  await user.save();
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
