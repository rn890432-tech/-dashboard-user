// Edit recipe form
app.get('/recipe/:id/edit', (req, res) => {
  const recipe = recipes.find(r => r.id === parseInt(req.params.id));
  if (!recipe) return res.status(404).send('Recipe not found');
  res.render('edit', { recipe });
});

// Edit recipe POST
app.post('/recipe/:id/edit', upload.single('image'), (req, res) => {
  const recipe = recipes.find(r => r.id === parseInt(req.params.id));
  if (!recipe) return res.status(404).send('Recipe not found');
  const { title, description, ingredients, instructions } = req.body;
  recipe.title = title;
  recipe.description = description;
  recipe.ingredients = ingredients;
  recipe.instructions = instructions;
  if (req.file) {
    recipe.imageUrl = '/uploads/' + req.file.filename;
  }
  res.redirect('/recipe/' + recipe.id);
});

// Delete recipe
app.post('/recipe/:id/delete', (req, res) => {
  const idx = recipes.findIndex(r => r.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).send('Recipe not found');
  recipes.splice(idx, 1);
  res.redirect('/');
});

const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('passport');

const { connectDB, DB_TYPE, db } = require('./db');
const { createUserTable, addUserSqlite, findUserByUsernameSqlite, User } = require('./userModel');

const { createRecipeTable } = require('./recipeModel');
const passport = require('./auth');
const multer = require('multer');
bcrypt = require('bcrypt');

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'public', 'uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });
(async () => {
  await connectDB();
  if (DB_TYPE === 'sqlite') {
    createUserTable(db);
    createRecipeTable(db);
  }
})();

// Auth routes
app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hash = bcrypt.hashSync(password, 10);
  if (DB_TYPE === 'mongodb') {
    try {
      await User.create({ username, password: hash });
      res.redirect('/login');
    } catch (e) {
      res.render('register', { error: 'Username already exists.' });
    }
  } else {
    findUserByUsernameSqlite(db, username, (err, user) => {
      if (user) return res.render('register', { error: 'Username already exists.' });
      addUserSqlite(db, { username, password: hash }, (err) => {
        if (err) return res.render('register', { error: 'Registration failed.' });
        res.redirect('/login');
      });
    });
  }
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: false
}));

app.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

// Google OAuth
app.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }));
app.get('/auth/google/callback', passport.authenticate('google', {
  successRedirect: '/',
  failureRedirect: '/login'
}));

// GitHub OAuth
app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'] }));
app.get('/auth/github/callback', passport.authenticate('github', {
  successRedirect: '/',
  failureRedirect: '/login'
}));


const app = express();
const PORT = process.env.PORT || 3000;

(async () => {
  await connectDB();
  if (DB_TYPE === 'sqlite') {
    createUserTable(db);
    createRecipeTable(db);
  }
})();


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'supersecret',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Middleware to make user available in all views
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();

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

app.post('/add', upload.single('image'), (req, res) => {
  const { title, description, ingredients, instructions } = req.body;
  let imageUrl = '';
  if (req.file) {
    imageUrl = '/uploads/' + req.file.filename;
  }
  recipes.push({ id: nextId++, title, description, ingredients, instructions, imageUrl });
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
