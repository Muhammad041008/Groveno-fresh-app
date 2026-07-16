const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/payment.controller');

router.post('/create-order', auth, ctrl.createOrder);
router.post('/verify', auth, ctrl.verify);

module.exports = router;
