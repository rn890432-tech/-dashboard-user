const Recipe = require('../models/Recipe');

// Pagination helper
function paginate(query, page = 1, limit = 10) {
  return query.skip((page - 1) * limit).limit(limit);
}

exports.getRecipes = async (req, res) => {
  try {
    const { ingredient, page = 1, limit = 10 } = req.query;
    let filter = {};
    if (ingredient) {
      filter['ingredients.name'] = { $regex: ingredient, $options: 'i' };
    }
    const query = Recipe.find(filter).sort({ createdAt: -1 });
    const recipes = await paginate(query, page, limit).exec();
    const total = await Recipe.countDocuments(filter);
    res.json({ recipes, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createRecipe = async (req, res) => {
  try {
    const recipe = new Recipe({ ...req.body, createdBy: req.user._id });
    await recipe.save();
    res.status(201).json(recipe);
  } catch (err) {
    res.status(400).json({ error: 'Invalid recipe data' });
  }
};

exports.getRecipeById = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    res.json(recipe);
  } catch (err) {
    res.status(400).json({ error: 'Invalid recipe ID' });
  }
};

exports.updateRecipe = async (req, res) => {
  try {
    const recipe = await Recipe.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    res.json(recipe);
  } catch (err) {
    res.status(400).json({ error: 'Invalid recipe data' });
  }
};

exports.deleteRecipe = async (req, res) => {
  try {
    const recipe = await Recipe.findByIdAndDelete(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    res.json({ message: 'Recipe deleted' });
  } catch (err) {
    res.status(400).json({ error: 'Invalid recipe ID' });
  }
};

exports.rateRecipe = async (req, res) => {
  try {
    const { value } = req.body;
    if (value < 1 || value > 5) return res.status(400).json({ error: 'Rating must be 1-5' });
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    // Remove previous rating by user
    recipe.ratings = recipe.ratings.filter(r => r.user.toString() !== req.user._id.toString());
    recipe.ratings.push({ user: req.user._id, value });
    await recipe.save();
    res.json({ averageRating: recipe.averageRating });
  } catch (err) {
    res.status(400).json({ error: 'Invalid rating' });
  }
};

exports.commentRecipe = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Comment text required' });
    const recipe = await Recipe.findById(req.params.id);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    recipe.comments.push({ user: req.user._id, text });
    await recipe.save();
    res.json(recipe.comments);
  } catch (err) {
    res.status(400).json({ error: 'Invalid comment' });
  }
};
