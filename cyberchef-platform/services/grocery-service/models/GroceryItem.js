const { mongoose } = require('../db');

const groceryItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
      index: true,
    },
    quantity: { type: Number, default: 1, min: 1 },
    unit: {
      type: String,
      default: 'pcs',
      trim: true,
      minlength: 1,
      maxlength: 24,
    },
    checked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

groceryItemSchema.index({ checked: 1, createdAt: -1 });

module.exports = mongoose.model('GroceryItem', groceryItemSchema);
