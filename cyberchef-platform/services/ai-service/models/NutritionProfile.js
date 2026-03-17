const mongoose = require('mongoose');

const NutritionProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  dietType: { type: String, required: true },
  allergies: { type: [String], default: [] },
  dailyCalorieGoal: { type: Number },
  proteinGoal: { type: Number },
  carbGoal: { type: Number },
  fatGoal: { type: Number },
  favoriteIngredients: { type: [String], default: [] },
  dislikedIngredients: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('NutritionProfile', NutritionProfileSchema);
