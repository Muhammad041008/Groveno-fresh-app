const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/coins.controller');

router.get('/balance', auth, ctrl.balance);
router.get('/history', auth, ctrl.history);
router.post('/validate-cl', auth, ctrl.validateCL);

module.exports = router;
