const Product = require('../models/Product');
const Category = require('../models/Category');
const PickupPoint = require('../models/PickupPoint');
const { asyncHandler } = require('../utils/helpers');

exports.listProducts = asyncHandler(async (req, res) => {
  const { category, search, page = 1, limit = 10, express } = req.query;
  const filter = { isActive: true };
  if (category) {
    // accept slug or id
    const cat = await Category.findOne({ $or: [{ slug: category }, { _id: category.match(/^[0-9a-f]{24}$/i) ? category : null }] });
    if (cat) filter.category = cat._id;
  }
  if (express === 'true') filter.isExpress = true;
  if (search) filter.name = { $regex: search, $options: 'i' };

  const skip = (Number(page) - 1) * Number(limit);
  const [products, total] = await Promise.all([
    Product.find(filter).populate('category', 'name slug').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Product.countDocuments(filter),
  ]);
  return res.json({
    success: true,
    products,
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / Number(limit)),
  });
});

exports.getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('category', 'name slug');
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  return res.json({ success: true, product });
});

exports.listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
  return res.json({ success: true, categories });
});

exports.listPickupPoints = asyncHandler(async (req, res) => {
  const points = await PickupPoint.find({ isActive: true }).sort({ name: 1 });
  return res.json({ success: true, pickupPoints: points });
});

// --- Admin CRUD ---
exports.createProduct = asyncHandler(async (req, res) => {
  const data = req.body;
  if (!data.slug && data.name) data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  if (data.category) {
    const cat = await Category.findById(data.category);
    if (cat) data.categoryName = cat.name;
  }
  const product = await Product.create(data);
  return res.status(201).json({ success: true, product });
});

exports.updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  return res.json({ success: true, product });
});

exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  return res.json({ success: true, message: 'Deleted' });
});

exports.createCategory = asyncHandler(async (req, res) => {
  const data = req.body;
  if (!data.slug && data.name) data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const cat = await Category.create(data);
  return res.status(201).json({ success: true, category: cat });
});

exports.updateCategory = asyncHandler(async (req, res) => {
  const cat = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });
  return res.json({ success: true, category: cat });
});

exports.adminListPickup = asyncHandler(async (req, res) => {
  const points = await PickupPoint.find({}).sort({ name: 1 });
  return res.json({ success: true, pickupPoints: points });
});

exports.createPickupPoint = asyncHandler(async (req, res) => {
  const pp = await PickupPoint.create(req.body);
  return res.status(201).json({ success: true, pickupPoint: pp });
});

exports.updatePickupPoint = asyncHandler(async (req, res) => {
  const pp = await PickupPoint.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!pp) return res.status(404).json({ success: false, message: 'Pickup point not found' });
  return res.json({ success: true, pickupPoint: pp });
});
