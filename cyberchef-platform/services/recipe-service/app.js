require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const recipeRoutes = require('./routes/recipeRoutes');
const shareRoutes = require('./routes/share');

const app = express();
app.use(express.json());

connectDB();

app.use('/api', recipeRoutes);
app.use('/api/recipes', shareRoutes);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Recipe Service running on port ${PORT}`);
});
