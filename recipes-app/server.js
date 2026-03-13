const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// In-memory recipe store
const recipes = [
  {
    id: 1,
    title: 'Classic Pancakes',
    description: 'Fluffy pancakes perfect for breakfast.',
    ingredients: 'Flour, Eggs, Milk, Baking Powder, Sugar, Salt',
    instructions: 'Mix ingredients, cook on griddle, serve hot.'
  },
  {
    id: 2,
    title: 'Spaghetti Carbonara',
    description: 'Creamy Italian pasta with bacon.',
    ingredients: 'Spaghetti, Eggs, Parmesan, Bacon, Pepper',
    instructions: 'Cook pasta, mix with sauce, add bacon.'
  }
];
let nextId = 3;

app.get('/', (req, res) => {
  const q = req.query.q || '';
  let filtered = recipes;
  if (q) {
    filtered = recipes.filter(r =>
      r.title.toLowerCase().includes(q.toLowerCase()) ||
      r.ingredients.toLowerCase().includes(q.toLowerCase())
    );
  }
  res.render('index', { recipes: filtered, q });
});

// Recipe detail view
app.get('/recipe/:id', (req, res) => {
  const recipe = recipes.find(r => r.id === parseInt(req.params.id));
  if (!recipe) return res.status(404).send('Recipe not found');
  res.render('detail', { recipe });
});

app.get('/add', (req, res) => {
  res.render('add');
});

app.post('/add', (req, res) => {
  const { title, description, ingredients, instructions } = req.body;
  recipes.push({ id: nextId++, title, description, ingredients, instructions });
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
