const Follow = require('../models/Follow');
const Like = require('../models/Like');
const CommentThread = require('../models/CommentThread');
const Activity = require('../models/Activity');

exports.followUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId === req.user._id.toString()) return res.status(400).json({ error: 'Cannot follow yourself' });
    const already = await Follow.findOne({ follower: req.user._id, following: userId });
    if (already) return res.status(400).json({ error: 'Already following' });
    await Follow.create({ follower: req.user._id, following: userId });
    await Activity.create({ user: req.user._id, type: 'follow', target: userId });
    res.json({ message: 'Followed user' });
  } catch (err) {
    res.status(400).json({ error: 'Follow failed' });
  }
};

exports.likeRecipe = async (req, res) => {
  try {
    const { recipeId } = req.params;
    const already = await Like.findOne({ user: req.user._id, recipe: recipeId });
    if (already) return res.status(400).json({ error: 'Already liked' });
    await Like.create({ user: req.user._id, recipe: recipeId });
    await Activity.create({ user: req.user._id, type: 'like', target: recipeId });
    res.json({ message: 'Liked recipe' });
  } catch (err) {
    res.status(400).json({ error: 'Like failed' });
  }
};

exports.commentThread = async (req, res) => {
  try {
    const { recipeId } = req.params;
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Comment text required' });
    let thread = await CommentThread.findOne({ recipe: recipeId });
    if (!thread) thread = await CommentThread.create({ recipe: recipeId, comments: [] });
    thread.comments.push({ user: req.user._id, text });
    await thread.save();
    await Activity.create({ user: req.user._id, type: 'comment', target: recipeId });
    res.json(thread.comments);
  } catch (err) {
    res.status(400).json({ error: 'Comment failed' });
  }
};

exports.getFeed = async (req, res) => {
  try {
    // Trending: likes, recent activity, engagement
    const recentLikes = await Like.find().sort({ createdAt: -1 }).limit(20);
    const recentComments = await Activity.find({ type: 'comment' }).sort({ createdAt: -1 }).limit(20);
    const recentFollows = await Activity.find({ type: 'follow' }).sort({ createdAt: -1 }).limit(20);
    // Trending algorithm: recipes with most likes in last 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const trending = await Like.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$recipe', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    res.json({ trending, recentLikes, recentComments, recentFollows });
  } catch (err) {
    res.status(500).json({ error: 'Feed error' });
  }
};
