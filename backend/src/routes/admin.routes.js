const router = require('express').Router();
const adminAuth = require('../middleware/adminAuth');
const ctrl = require('../controllers/admin.controller');
const productCtrl = require('../controllers/product.controller');

router.get('/dashboard', adminAuth, ctrl.dashboard);

// Orders
router.get('/orders', adminAuth, ctrl.orders);
router.put('/orders/:id/status', adminAuth, ctrl.updateOrderStatus);

// Users
router.get('/users', adminAuth, ctrl.listUsers);
router.get('/users/:id', adminAuth, ctrl.getUser);
router.post('/users/:id/credit-wallet', adminAuth, ctrl.creditUserWallet);

// CLs
router.get('/cls', adminAuth, ctrl.listCLs);
router.post('/cls', adminAuth, ctrl.createCL);
router.put('/cls/:id/approve', adminAuth, ctrl.approveCL);

// Products
router.post('/products', adminAuth, productCtrl.createProduct);
router.put('/products/:id', adminAuth, productCtrl.updateProduct);
router.delete('/products/:id', adminAuth, productCtrl.deleteProduct);

// Categories
router.post('/categories', adminAuth, productCtrl.createCategory);
router.put('/categories/:id', adminAuth, productCtrl.updateCategory);

// Pickup Points
router.get('/pickup-points', adminAuth, productCtrl.adminListPickup);
router.post('/pickup-points', adminAuth, productCtrl.createPickupPoint);
router.put('/pickup-points/:id', adminAuth, productCtrl.updatePickupPoint);

// Live express pickup
router.get('/express-pickup/active', adminAuth, ctrl.expressPickupActive);

// Reports
router.get('/reports/revenue', adminAuth, ctrl.revenueReport);
router.get('/reports/qr-analytics', adminAuth, ctrl.qrAnalytics);

module.exports = router;
