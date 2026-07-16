const mongoose = require('mongoose');

const AddressSchema = new mongoose.Schema({
  label: { type: String, default: 'Home' },
  line1: String,
  line2: String,
  city: String,
  state: String,
  pincode: String,
  landmark: String,
  lat: Number,
  lng: Number,
  isDefault: { type: Boolean, default: false },
}, { _id: true, timestamps: true });

const UserSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true, index: true },
  name: { type: String, default: '' },
  email: { type: String, default: '' },
  addresses: [AddressSchema],
  walletBalance: { type: Number, default: 0 },
  coins: { type: Number, default: 0 },
  coinsExpiresAt: { type: Date, default: null },
  clOrderCount: { type: Number, default: 0 }, // how many CL orders placed (for 50/15 coin logic)
  ratingSkipCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  lastLoginAt: { type: Date, default: null },
}, { timestamps: true });

UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  return obj;
};

module.exports = mongoose.model('User', UserSchema);
