const mongoose = require('mongoose');

const IngredientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: String, required: true }
});

const RecipeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  ingredients: [IngredientSchema],
  steps: [{ type: String }],
  image: { type: String },
  ratings: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, value: { type: Number, min: 1, max: 5 } }],
  comments: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, text: { type: String }, createdAt: { type: Date, default: Date.now } }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

RecipeSchema.virtual('averageRating').get(function () {
  if (!this.ratings.length) return 0;
  return (
    this.ratings.reduce((sum, r) => sum + r.value, 0) / this.ratings.length
  );
});

module.exports = mongoose.model('Recipe', RecipeSchema);
