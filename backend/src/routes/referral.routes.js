const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/referral.controller');

router.get('/me', auth, ctrl.me);
router.post('/apply', auth, ctrl.apply);

module.exports = router;
