const mapAnalytics = require('../analytics/mapAnalytics');
router.use('/analytics', mapAnalytics);
const explore = require('../discovery/explore');
router.use('/explore', explore);
const foodMap = require('../discovery/foodMap');
router.use('/discovery', foodMap);
const express = require('express');
const router = express.Router();
const videoGenerator = require('../video/videoGenerator');
const creatorMarketplace = require('../creator/creatorMarketplace');

// All mobile API routes will be mounted under /api/mobile/
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mobile API Gateway running' });
});

router.use('/video', videoGenerator);
router.use('/creator', creatorMarketplace);
module.exports = router;
