const router = require('express').Router();
const ctrl = require('../controllers/stream.controller');

// Auth is via ?token= query since EventSource can't set headers.
router.get('/orders/:id/stream', ctrl.customerOrderStream);
router.get('/admin/express-pickup/stream', ctrl.adminExpressStream);

module.exports = router;
