require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const feedRoutes = require('./routes/feedRoutes');

const app = express();
app.use(express.json());

connectDB();

app.use('/api', feedRoutes);

const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
  console.log(`Feed Service running on port ${PORT}`);
});
