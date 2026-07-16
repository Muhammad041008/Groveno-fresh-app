const mongoose = require('mongoose');

const PickupPointSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  pincode: { type: String, default: '' },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  contactPhone: { type: String, default: '' },
  openingHours: { type: String, default: '6:00 AM - 10:00 PM' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

PickupPointSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  return obj;
};

module.exports = mongoose.model('PickupPoint', PickupPointSchema);
