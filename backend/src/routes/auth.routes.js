const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/auth.controller');

router.post('/send-otp', ctrl.sendOtp);
router.post('/verify-otp', ctrl.verifyOtp);
router.get('/me', auth, ctrl.me);
router.put('/profile', auth, ctrl.updateProfile);
router.post('/add-address', auth, ctrl.addAddress);

module.exports = router;
