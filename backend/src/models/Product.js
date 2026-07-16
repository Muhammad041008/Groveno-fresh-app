const mongoose = require('mongoose');

const VariantSchema = new mongoose.Schema({
  size: { type: String, enum: ['small', 'medium', 'large'], required: true },
  label: { type: String, default: '' }, // e.g. "500g", "1kg"
  price: { type: Number, required: true },
  mrp: { type: Number, required: true },
  stock: { type: Number, default: 100 },
  unit: { type: String, default: 'kg' },
}, { _id: true });

const RatingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  stars: { type: Number, min: 1, max: 5 },
  review: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String, default: '' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  categoryName: { type: String, default: '' },
  images: [{ type: String }],
  variants: [VariantSchema],
  isExpress: { type: Boolean, default: false, index: true }, // available for express pickup
  isOrganic: { type: Boolean, default: false },
  tags: [{ type: String }],
  ratings: [RatingSchema],
  avgRating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

ProductSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  return obj;
};

ProductSchema.methods.recomputeRating = function () {
  if (!this.ratings.length) {
    this.avgRating = 0;
    this.ratingCount = 0;
    return;
  }
  const sum = this.ratings.reduce((a, r) => a + r.stars, 0);
  this.avgRating = Number((sum / this.ratings.length).toFixed(2));
  this.ratingCount = this.ratings.length;
};

module.exports = mongoose.model('Product', ProductSchema);
