const router = require('express').Router();
const clAuth = require('../middleware/clAuth');
const ctrl = require('../controllers/cl.controller');

// public
router.get('/validate/:code', ctrl.validateCode);

// authenticated CL
router.get('/dashboard', clAuth, ctrl.dashboard);
router.get('/orders', clAuth, ctrl.myOrders);
router.put('/orders/:id/deliver', clAuth, ctrl.markDelivered);

module.exports = router;
