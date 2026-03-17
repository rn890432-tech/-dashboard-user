const express = require('express');
const feedController = require('../controllers/feedController');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/follow/:userId', auth(), feedController.followUser);
router.post('/like/:recipeId', auth(), feedController.likeRecipe);
router.post('/comment/:recipeId', auth(), feedController.commentThread);
router.get('/feed', auth(), feedController.getFeed);

module.exports = router;
