const express = require('express');
const recommendationController = require('../controllers/recommendationController');

const router = express.Router();

router.get('/recommendations', recommendationController.getRecommendations);
router.get('/predictive-analytics', recommendationController.getPredictiveAnalytics);

module.exports = router;
