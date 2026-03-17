const express = require('express');
const adminController = require('../controllers/adminController');
const auth = require('../../auth-service/middleware/auth');

const router = express.Router();

router.post('/ban-user/:userId', auth('admin'), adminController.banUser);
router.delete('/delete-recipe/:recipeId', auth('admin'), adminController.deleteRecipe);
router.post('/moderate-comment/:commentId', auth('admin'), adminController.moderateComment);
router.get('/view-analytics', auth('admin'), adminController.viewAnalytics);

module.exports = router;
