const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: String,
  image: String,
  variantId: mongoose.Schema.Types.ObjectId,
  variantSize: String,
  variantLabel: String,
  price: Number,
  mrp: Number,
  quantity: { type: Number, default: 1 },
  subtotal: Number,
  // Category denormalised from Product at order-creation time so it survives
  // product document edits and provides fast filtering without joins.
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  categoryName: { type: String, default: '' },
}, { _id: true });

const RatingEntrySchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  stars: { type: Number, min: 1, max: 5 },
  review: { type: String, default: '' },
}, { _id: false });

const LocationPingSchema = new mongoose.Schema({
  lat: Number,
  lng: Number,
  distanceToHub: Number,
  ts: { type: Date, default: Date.now },
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true, index: true }, // GRV-2026-00001
  channel: { type: String, enum: ['home_delivery', 'express_pickup', 'cl_order'], required: true, index: true },
  status: {
    type: String,
    enum: [
      'placed', 'confirmed', 'packed', 'out_for_delivery', 'delivered',
      'ready_for_pickup', 'customer_on_way', 'arrived', 'collected',
      'cancelled', 'rejected'
    ],
    default: 'placed',
    index: true,
  },

  // Parties
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  userName: String,
  userPhone: String,
  clId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityLeader', default: null, index: true },
  clCode: { type: String, default: null },
  customerName: { type: String, default: '' }, // for CL orders placed on behalf

  // Items & totals
  items: [OrderItemSchema],
  itemsTotal: { type: Number, default: 0 },
  deliveryFee: { type: Number, default: 0 },
  expressCharge: { type: Number, default: 0 }, // 30min express or pickup confirmation
  pickupDiscount: { type: Number, default: 0 }, // 5% for express pickup
  clDiscount: { type: Number, default: 0 },
  coinsUsed: { type: Number, default: 0 },
  coinsValue: { type: Number, default: 0 },
  total: { type: Number, default: 0 },

  // Delivery
  address: {
    label: String, line1: String, line2: String,
    city: String, state: String, pincode: String,
    landmark: String, lat: Number, lng: Number,
  },
  deliverySlot: { type: String, default: '' }, // morning | evening | express_30min
  deliveryDate: { type: Date, default: null },

  // Express pickup
  pickupPointId: { type: mongoose.Schema.Types.ObjectId, ref: 'PickupPoint', default: null },
  pickupPointName: { type: String, default: '' },
  pickupPointLat: { type: Number, default: null },
  pickupPointLng: { type: Number, default: null },
  pickupTime: { type: String, default: '' },
  pickupOtp: { type: String, default: '' }, // order id verification code
  trackingStartedAt: { type: Date, default: null },
  arrivedAt: { type: Date, default: null },
  collectedAt: { type: Date, default: null },
  locationPings: [LocationPingSchema],

  // Payment
  paymentMethod: { type: String, enum: ['cod', 'online', 'wallet'], default: 'cod' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  razorpayOrderId: { type: String, default: '' },
  razorpayPaymentId: { type: String, default: '' },
  razorpaySignature: { type: String, default: '' },

  // CL commission
  clCommission: { type: Number, default: 0 },
  clCommissionCredited: { type: Boolean, default: false },

  // Coins reward
  coinsEarned: { type: Number, default: 0 },
  coinsCredited: { type: Boolean, default: false },

  // Rating
  ratingStatus: { type: String, enum: ['not_prompted', 'pending', 'rated', 'skipped'], default: 'not_prompted' },
  ratings: [RatingEntrySchema],
  ratingSkipCount: { type: Number, default: 0 },

  // Timestamps for lifecycle
  placedAt: { type: Date, default: Date.now },
  deliveredAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
}, { timestamps: true });

OrderSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  return obj;
};

module.exports = mongoose.model('Order', OrderSchema);
