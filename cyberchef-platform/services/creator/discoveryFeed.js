// Discovery feed logic (Stub)
const logic = require('./creatorMarketplaceLogic');

function getTrendingCreators() {
  // Example: Sort creators by followers, earnings, recipe count
  const allCreators = Object.entries(logic.creators).map(([id, c]) => ({
    creatorId: id,
    profile: c.profile,
    earnings: c.earnings,
    recipes: c.recipes.length,
    followers: c.profile?.followers || 0
  }));
  // Sort by followers and earnings
  return allCreators.sort((a, b) => b.followers + b.earnings - (a.followers + a.earnings)).slice(0, 10);
}

module.exports = { getTrendingCreators };
