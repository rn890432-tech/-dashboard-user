// Example analytics dashboard logic (Stub)
const logic = require('./creatorMarketplaceLogic');

function getCreatorAnalytics(creatorId) {
  const creator = logic.creators[creatorId];
  if (!creator) return null;
  return {
    earnings: creator.earnings,
    recipes: creator.recipes.length,
    subscriptions: logic.subscriptions.filter(s => s.creatorId === creatorId).length,
    views: logic.videoViews.filter(rid => logic.recipes[rid]?.creatorId === creatorId).length
  };
}

module.exports = { getCreatorAnalytics };
