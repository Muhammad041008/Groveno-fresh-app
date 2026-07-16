const router = require('express').Router();
const auth = require('../middleware/auth');
const clAuth = require('../middleware/clAuth');
const adminAuth = require('../middleware/adminAuth');
const ctrl = require('../controllers/order.controller');
const loc = require('../controllers/location.controller');

// Placing orders
router.post('/home-delivery', auth, ctrl.homeDelivery);
router.post('/express-pickup', auth, ctrl.expressPickup);
router.post('/cl-order', clAuth, ctrl.clOrder);
router.post('/cl-bulk', clAuth, ctrl.clBulk);

// Rating & lists (specific paths BEFORE :id param)
router.get('/pending-rating', auth, ctrl.pendingRating);
router.get('/', auth, ctrl.myOrders);

// Location tracking
router.post('/:id/start-tracking', auth, loc.startTracking);
router.post('/:id/location-update', auth, loc.locationUpdate);
router.post('/:id/arrived', auth, loc.arrived);
router.put('/:id/collected', adminAuth, loc.collected);

// Rating
router.post('/:id/rate', auth, ctrl.rateOrder);
router.post('/:id/skip-rating', auth, ctrl.skipRating);

router.get('/:id', auth, ctrl.getOrder);

module.exports = router;
