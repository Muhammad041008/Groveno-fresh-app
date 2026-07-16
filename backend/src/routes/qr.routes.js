const router = require('express').Router();
const ctrl = require('../controllers/qr.controller');

router.get('/track', ctrl.track);

module.exports = router;
