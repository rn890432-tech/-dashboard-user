// Grocery Price Estimation
const priceDb = {
  'chicken': 5.0,
  'lettuce': 2.0,
  'rice': 1.5,
  'milk': 2.5,
  'tomato': 1.2,
  'bread': 2.0,
  'avocado': 2.5,
  'beef': 6.0,
  'cheese': 3.0,
  'egg': 0.2,
  'tofu': 2.0,
  'fish': 4.0,
  'beans': 1.0,
  'pasta': 1.5,
  'quinoa': 3.0,
  'oats': 2.0,
  'yogurt': 2.0,
  'butter': 2.0,
  'salt': 0.5,
  'pepper': 0.5,
  'cumin': 0.5,
  'paprika': 0.5,
  'oregano': 0.5
};

function estimatePrice(groceryList) {
  let total = 0;
  Object.values(groceryList).forEach(items => {
    items.forEach(item => {
      const price = priceDb[item.name.toLowerCase()] || 1.0;
      total += price * (item.quantity || 1);
    });
  });
  return total;
}

module.exports = { estimatePrice };
