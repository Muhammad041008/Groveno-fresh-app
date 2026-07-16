const mongoose = require('mongoose');

const WalletTransactionSchema = new mongoose.Schema({
  ownerType: { type: String, enum: ['user', 'cl'], required: true, index: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  type: { type: String, enum: ['credit', 'debit'], required: true },
  amount: { type: Number, required: true },
  balanceAfter: { type: Number, default: 0 },
  source: { type: String, default: 'manual' }, // manual, cl_commission, refund, order_payment, etc.
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  description: { type: String, default: '' },
  meta: { type: Object, default: {} },
}, { timestamps: true });

WalletTransactionSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  return obj;
};

module.exports = mongoose.model('WalletTransaction', WalletTransactionSchema);
