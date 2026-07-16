const router = require('express').Router();
const adminAuth = require('../middleware/adminAuth');
const ctrl = require('../controllers/adminAuth.controller');

router.post('/login', ctrl.login);
router.get('/me', adminAuth, ctrl.me);

module.exports = router;
