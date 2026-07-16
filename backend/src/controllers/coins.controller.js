const CoinTransaction = require('../models/CoinTransaction');
const CommunityLeader = require('../models/CommunityLeader');
const { asyncHandler } = require('../utils/helpers');

exports.balance = asyncHandler(async (req, res) => {
  const now = new Date();
  let coins = req.user.coins || 0;
  if (req.user.coinsExpiresAt && req.user.coinsExpiresAt < now) {
    // expire coins lazily
    if (coins > 0) {
      await CoinTransaction.create({
        userId: req.user._id, type: 'expire', amount: coins, balanceAfter: 0,
        source: 'expire', description: 'Coins expired',
      });
      req.user.coins = 0;
      req.user.coinsExpiresAt = null;
      await req.user.save();
      coins = 0;
    }
  }
  return res.json({ success: true, coins, expiresAt: req.user.coinsExpiresAt });
});

exports.history = asyncHandler(async (req, res) => {
  const txns = await CoinTransaction.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100);
  return res.json({ success: true, transactions: txns });
});

exports.validateCL = asyncHandler(async (req, res) => {
  const { clCode } = req.body;
  if (!clCode) return res.status(400).json({ success: false, message: 'clCode is required' });
  const cl = await CommunityLeader.findOne({ clCode: clCode.toUpperCase(), status: 'approved' });
  if (!cl) return res.json({ valid: false });

  const isFirst = (req.user.clOrderCount || 0) === 0;
  return res.json({
    valid: true,
    clName: cl.name,
    society: cl.societyName,
    coinsToEarn: isFirst ? 50 : 15,
  });
});
