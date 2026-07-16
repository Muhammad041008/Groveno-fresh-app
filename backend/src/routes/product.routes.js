const router = require('express').Router();
const ctrl = require('../controllers/product.controller');

// PUBLIC
router.get('/', ctrl.listProducts);
router.get('/:id', ctrl.getProduct);

module.exports = router;
