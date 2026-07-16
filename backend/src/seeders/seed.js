/* Seed script: node src/seeders/seed.js */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Admin = require('../models/Admin');
const Category = require('../models/Category');
const Product = require('../models/Product');
const PickupPoint = require('../models/PickupPoint');
const CommunityLeader = require('../models/CommunityLeader');

const CATEGORIES = [
  { name: 'Fruits', slug: 'fruits', icon: '🍎', sortOrder: 1 },
  { name: 'Vegetables', slug: 'vegetables', icon: '🥦', sortOrder: 2 },
  { name: 'Leafy Greens', slug: 'leafy-greens', icon: '🥬', sortOrder: 3 },
  { name: 'Herbs', slug: 'herbs', icon: '🌿', sortOrder: 4 },
  { name: 'Organic', slug: 'organic', icon: '🌱', sortOrder: 5 },
];

const PRODUCT_SEEDS = [
  { name: 'Alphonso Mango', slug: 'alphonso-mango', category: 'fruits',
    description: 'Premium Ratnagiri Alphonso mangoes, hand-picked.',
    isExpress: true, images: ['https://images.unsplash.com/photo-1553279768-865429fa0078?w=600'],
    variants: [
      { size: 'small', label: '500g', price: 249, mrp: 299, stock: 100, unit: 'g' },
      { size: 'medium', label: '1kg', price: 449, mrp: 549, stock: 80, unit: 'kg' },
      { size: 'large', label: '2kg', price: 849, mrp: 999, stock: 40, unit: 'kg' },
    ],
  },
  { name: 'Apple Shimla', slug: 'apple-shimla', category: 'fruits',
    description: 'Fresh Shimla apples, crisp and juicy.',
    isExpress: true, images: ['https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=600'],
    variants: [
      { size: 'small', label: '500g', price: 129, mrp: 149, stock: 100 },
      { size: 'medium', label: '1kg', price: 239, mrp: 279, stock: 80 },
      { size: 'large', label: '2kg', price: 449, mrp: 529, stock: 40 },
    ],
  },
  { name: 'Banana Robusta', slug: 'banana-robusta', category: 'fruits',
    description: 'Robusta bananas, farm fresh.',
    isExpress: true, images: ['https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600'],
    variants: [
      { size: 'small', label: '6 pcs', price: 49, mrp: 59, stock: 200 },
      { size: 'medium', label: '12 pcs', price: 89, mrp: 109, stock: 150 },
      { size: 'large', label: '1 dozen + 6', price: 129, mrp: 149, stock: 100 },
    ],
  },
  { name: 'Tomato', slug: 'tomato', category: 'vegetables',
    description: 'Hybrid tomatoes, fresh and firm.',
    isExpress: true, images: ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600'],
    variants: [
      { size: 'small', label: '500g', price: 25, mrp: 30, stock: 300 },
      { size: 'medium', label: '1kg', price: 45, mrp: 55, stock: 200 },
      { size: 'large', label: '2kg', price: 85, mrp: 99, stock: 100 },
    ],
  },
  { name: 'Onion', slug: 'onion', category: 'vegetables',
    description: 'Fresh nasik onions.',
    isExpress: true, images: ['https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600'],
    variants: [
      { size: 'small', label: '500g', price: 30, mrp: 35, stock: 300 },
      { size: 'medium', label: '1kg', price: 55, mrp: 65, stock: 250 },
      { size: 'large', label: '2kg', price: 105, mrp: 125, stock: 150 },
    ],
  },
  { name: 'Potato', slug: 'potato', category: 'vegetables',
    description: 'Freshly harvested potatoes.',
    isExpress: true, images: ['https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600'],
    variants: [
      { size: 'small', label: '1kg', price: 35, mrp: 40, stock: 300 },
      { size: 'medium', label: '2kg', price: 65, mrp: 75, stock: 200 },
      { size: 'large', label: '5kg', price: 149, mrp: 179, stock: 80 },
    ],
  },
  { name: 'Spinach (Palak)', slug: 'spinach-palak', category: 'leafy-greens',
    description: 'Fresh palak, rich in iron.',
    isExpress: true, images: ['https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600'],
    variants: [
      { size: 'small', label: '250g', price: 19, mrp: 25, stock: 150 },
      { size: 'medium', label: '500g', price: 35, mrp: 45, stock: 100 },
      { size: 'large', label: '1kg', price: 65, mrp: 79, stock: 60 },
    ],
  },
  { name: 'Coriander', slug: 'coriander', category: 'herbs',
    description: 'Fresh coriander leaves, aromatic.',
    isExpress: true, images: ['https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=600'],
    variants: [
      { size: 'small', label: '100g', price: 12, mrp: 15, stock: 200 },
      { size: 'medium', label: '250g', price: 29, mrp: 35, stock: 150 },
      { size: 'large', label: '500g', price: 55, mrp: 65, stock: 80 },
    ],
  },
  { name: 'Mint Leaves', slug: 'mint-leaves', category: 'herbs',
    description: 'Refreshing mint leaves.',
    isExpress: true, images: ['https://images.unsplash.com/photo-1628556270448-4d4e4148e1a1?w=600'],
    variants: [
      { size: 'small', label: '50g', price: 15, mrp: 20, stock: 200 },
      { size: 'medium', label: '100g', price: 25, mrp: 30, stock: 150 },
      { size: 'large', label: '250g', price: 55, mrp: 65, stock: 80 },
    ],
  },
  { name: 'Organic Carrot', slug: 'organic-carrot', category: 'organic',
    description: 'Certified organic carrots.',
    isExpress: false, isOrganic: true,
    images: ['https://images.unsplash.com/photo-1447175008436-054170c2e979?w=600'],
    variants: [
      { size: 'small', label: '500g', price: 55, mrp: 69, stock: 100 },
      { size: 'medium', label: '1kg', price: 99, mrp: 129, stock: 80 },
      { size: 'large', label: '2kg', price: 189, mrp: 239, stock: 40 },
    ],
  },
];

const PICKUP_POINTS = [
  {
    name: 'Groveno Hub - Sector 62',
    address: 'Shop 12, Ithum Tower, Sector 62, Noida',
    city: 'Noida', state: 'UP', pincode: '201309',
    lat: 28.6272, lng: 77.3712,
    contactPhone: '+919000000001', openingHours: '6:00 AM - 10:00 PM',
  },
  {
    name: 'Groveno Hub - Techzone 4',
    address: 'Ace Divino, Techzone 4, Greater Noida West',
    city: 'Greater Noida', state: 'UP', pincode: '201306',
    lat: 28.5892, lng: 77.4415,
    contactPhone: '+919000000002', openingHours: '6:00 AM - 10:00 PM',
  },
];

(async () => {
  try {
    await connectDB();
    console.log('[Seed] Wiping existing seed collections...');
    await Promise.all([
      Admin.deleteMany({ email: 'admin@groveno.com' }),
      Category.deleteMany({}),
      Product.deleteMany({}),
      PickupPoint.deleteMany({}),
      CommunityLeader.deleteMany({ email: 'cl@groveno.com' }),
    ]);

    // Admin
    const admin = new Admin({ name: 'Groveno Admin', email: 'admin@groveno.com', role: 'super_admin' });
    await admin.setPassword('Admin@123');
    await admin.save();
    console.log('[Seed] ✔ Admin: admin@groveno.com / Admin@123');

    // Categories
    const catDocs = {};
    for (const c of CATEGORIES) {
      const doc = await Category.create(c);
      catDocs[c.slug] = doc;
    }
    console.log(`[Seed] ✔ Categories: ${Object.keys(catDocs).length}`);

    // Products
    for (const p of PRODUCT_SEEDS) {
      const cat = catDocs[p.category];
      await Product.create({
        ...p,
        category: cat._id,
        categoryName: cat.name,
        isActive: true,
      });
    }
    console.log(`[Seed] ✔ Products: ${PRODUCT_SEEDS.length}`);

    // Pickup points
    for (const pp of PICKUP_POINTS) await PickupPoint.create(pp);
    console.log(`[Seed] ✔ Pickup Points: ${PICKUP_POINTS.length}`);

    // Sample CL
    const cl = new CommunityLeader({
      name: 'Rahul Sharma',
      phone: '+919999888877',
      email: 'cl@groveno.com',
      societyName: 'Ace Divino, Techzone 4',
      clCode: 'CL12345',
      status: 'approved',
    });
    await cl.setPassword('CL@123');
    await cl.save();
    console.log('[Seed] ✔ CL: cl@groveno.com / CL@123 / code: CL12345');

    console.log('\n[Seed] ALL DONE ✅');
    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error('[Seed] Failed:', e);
    process.exit(1);
  }
})();
