const WalletTransaction = require('../models/WalletTransaction');
const User = require('../models/User');
const { asyncHandler } = require('../utils/helpers');

exports.myWallet = asyncHandler(async (req, res) => {
  const txns = await WalletTransaction.find({ ownerType: 'user', ownerId: req.user._id }).sort({ createdAt: -1 }).limit(50);
  return res.json({
    success: true,
    balance: req.user.walletBalance || 0,
    transactions: txns,
  });
});

// Admin credits user wallet
exports.adminCredit = asyncHandler(async (req, res) => {
  const { userId, amount, description } = req.body;
  if (!userId || !amount || amount <= 0) return res.status(400).json({ success: false, message: 'userId and positive amount required' });
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  user.walletBalance = (user.walletBalance || 0) + Number(amount);
  await user.save();
  const txn = await WalletTransaction.create({
    ownerType: 'user', ownerId: user._id,
    type: 'credit', amount: Number(amount), balanceAfter: user.walletBalance,
    source: 'manual', description: description || 'Admin credit',
  });
  return res.json({ success: true, balance: user.walletBalance, transaction: txn });
});
