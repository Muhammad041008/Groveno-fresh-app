const router = require('express').Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const ctrl = require('../controllers/wallet.controller');

router.get('/', auth, ctrl.myWallet);
router.post('/credit', adminAuth, ctrl.adminCredit);

module.exports = router;
