const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const BankDetailsSchema = new mongoose.Schema({
  accountHolder: { type: String, default: '' },
  accountNumber: { type: String, default: '' },
  ifsc: { type: String, default: '' },
  bankName: { type: String, default: '' },
}, { _id: false });

const CommunityLeaderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  societyName: { type: String, required: true },
  clCode: { type: String, required: true, unique: true, uppercase: true, index: true }, // e.g. CL12345
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending' },
  totalOrders: { type: Number, default: 0 },
  totalCommission: { type: Number, default: 0 },
  walletBalance: { type: Number, default: 0 },
  bankDetails: { type: BankDetailsSchema, default: () => ({}) },
  qrScans: {
    poster: { type: Number, default: 0 },
    whatsapp: { type: Number, default: 0 },
    standee: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
  },
}, { timestamps: true });

CommunityLeaderSchema.methods.setPassword = async function (password) {
  this.passwordHash = await bcrypt.hash(password, 10);
};

CommunityLeaderSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

CommunityLeaderSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj.passwordHash;
  return obj;
};

module.exports = mongoose.model('CommunityLeader', CommunityLeaderSchema);
