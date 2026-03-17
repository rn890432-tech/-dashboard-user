// Creator earnings and subscription logic (Stub)
const creators = {};
const recipes = {};
const subscriptions = [];
const videoViews = [];
const users = {};

function applyToCreator(userId, profile) {
  users[userId] = users[userId] || {};
  users[userId].creatorProfile = {
    creatorName: profile.creatorName,
    bio: profile.bio,
    profileImage: profile.profileImage,
    socialLinks: profile.socialLinks,
    verifiedStatus: profile.verifiedStatus || false,
    followers: 0
  };
  creators[userId] = creators[userId] || { earnings: 0, recipes: [], profile: users[userId].creatorProfile };
}

function uploadRecipe(creatorId, recipeData) {
  const recipeId = 'recipe_' + (Object.keys(recipes).length + 1);
  recipes[recipeId] = { ...recipeData, creatorId };
  if (!creators[creatorId]) creators[creatorId] = { earnings: 0, recipes: [] };
  creators[creatorId].recipes.push(recipeId);
  return recipeId;
}

function subscribeToCreator(userId, creatorId) {
  subscriptions.push({ userId, creatorId });
  // Example: Add subscription fee to creator earnings
  if (!creators[creatorId]) creators[creatorId] = { earnings: 0, recipes: [] };
  creators[creatorId].earnings += 5; // $5 per subscription
}

function addVideoView(recipeId) {
  videoViews.push(recipeId);
  const creatorId = recipes[recipeId]?.creatorId;
  if (creatorId) creators[creatorId].earnings += 0.01; // $0.01 per view
}

function getCreatorEarnings(creatorId) {
  return creators[creatorId]?.earnings || 0;
}

module.exports = {
  uploadRecipe,
  subscribeToCreator,
  addVideoView,
  getCreatorEarnings,
  creators,
  recipes,
  subscriptions,
  videoViews
};
