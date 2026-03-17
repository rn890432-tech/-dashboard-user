const express = require('express');
const billingController = require('../controllers/billingController');
const auth = require('../../auth-service/middleware/auth');

const router = express.Router();

router.post('/subscribe', auth(), billingController.createSubscription);
router.get('/plans', billingController.getPlans);

module.exports = router;
