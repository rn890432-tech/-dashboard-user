const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const auth = require('../../auth-service/middleware/auth');

const router = express.Router();

router.get('/recipe-growth', auth(), analyticsController.recipeGrowth);
router.get('/engagement', auth(), analyticsController.engagement);
router.get('/followers', auth(), analyticsController.followers);

module.exports = router;
