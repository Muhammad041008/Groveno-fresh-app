const mongoose = require('mongoose');

const CoinTransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['earn', 'redeem', 'expire'], required: true },
  amount: { type: Number, required: true },
  balanceAfter: { type: Number, default: 0 },
  source: { type: String, default: 'cl_order' }, // cl_order, rating, redemption, expire
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  expiresAt: { type: Date, default: null },
  description: { type: String, default: '' },
}, { timestamps: true });

CoinTransactionSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  return obj;
};

module.exports = mongoose.model('CoinTransaction', CoinTransactionSchema);
