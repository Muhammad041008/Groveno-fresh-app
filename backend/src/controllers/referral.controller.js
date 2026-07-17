const User = require('../models/User');
const CoinTransaction = require('../models/CoinTransaction');
const { asyncHandler } = require('../utils/helpers');

const REFERRAL_COINS = 10;
const REFERRAL_COIN_EXPIRY_DAYS = 90;

function generateReferralCode() {
  // GRV + 4 chars (uppercase alnum)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = 'GRV';
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

async function ensureReferralCode(user) {
  if (user.referralCode) return user.referralCode;
  for (let i = 0; i < 5; i++) {
    const code = generateReferralCode();
    const dup = await User.findOne({ referralCode: code });
    if (!dup) {
      user.referralCode = code;
      await user.save();
      return code;
    }
  }
  throw new Error('Failed to generate referral code');
}

// Apply a referral code to the currently authenticated user
exports.apply = asyncHandler(async (req, res) => {
  const { referralCode } = req.body || {};
  if (!referralCode) return res.status(400).json({ success: false, message: 'referralCode is required' });

  if (req.user.referredBy) {
    return res.status(400).json({ success: false, message: 'Referral already applied' });
  }
  if (req.user.firstOrderPlaced) {
    return res.status(400).json({ success: false, message: 'Cannot apply referral after first order' });
  }
  const code = String(referralCode).toUpperCase().trim();
  const referrer = await User.findOne({ referralCode: code });
  if (!referrer) return res.status(400).json({ success: false, message: 'Invalid referral code' });
  if (referrer._id.equals(req.user._id)) {
    return res.status(400).json({ success: false, message: 'Cannot use your own referral code' });
  }

  req.user.referredBy = referrer._id;
  req.user.referredByCode = code;
  await req.user.save();

  return res.json({ success: true, message: 'Referral applied. You friend will earn 10 Groveno Coins when you place your first order.' });
});

// Get my referral info + share link
exports.me = asyncHandler(async (req, res) => {
  const code = await ensureReferralCode(req.user);
  const base = process.env.APP_URL || (req.protocol + '://' + req.get('host'));
  const shareUrl = `${base}/api/qr/track?ref=${code}&source=referral`;

  const referredUsers = await User.countDocuments({ referredBy: req.user._id });

  return res.json({
    success: true,
    referralCode: code,
    shareUrl,
    referralCoinsPerFriend: REFERRAL_COINS,
    stats: {
      referredFriends: referredUsers,
      rewardsGiven: req.user.referralRewardsGiven || 0,
      coinsEarned: req.user.referralCoinsEarned || 0,
    },
  });
});

// Called from order controllers after an order is created to credit referrer if this is the user's first order
async function maybeCreditReferrer(user, order) {
  if (!user) return;
  if (user.firstOrderPlaced) return;
  user.firstOrderPlaced = true;
  await user.save();

  if (!user.referredBy) return;
  const referrer = await User.findById(user.referredBy);
  if (!referrer) return;

  const expiresAt = new Date(Date.now() + REFERRAL_COIN_EXPIRY_DAYS * 24 * 3600 * 1000);
  referrer.coins = (referrer.coins || 0) + REFERRAL_COINS;
  referrer.coinsExpiresAt = expiresAt;
  referrer.referralRewardsGiven = (referrer.referralRewardsGiven || 0) + 1;
  referrer.referralCoinsEarned = (referrer.referralCoinsEarned || 0) + REFERRAL_COINS;
  await referrer.save();

  await CoinTransaction.create({
    userId: referrer._id,
    type: 'earn',
    amount: REFERRAL_COINS,
    balanceAfter: referrer.coins,
    source: 'referral',
    orderId: order?._id || null,
    expiresAt,
    description: `Referral reward for friend ${user.name || user.phone}`,
  });
}

module.exports.maybeCreditReferrer = maybeCreditReferrer;
module.exports.ensureReferralCode = ensureReferralCode;
module.exports.REFERRAL_COINS = REFERRAL_COINS;
