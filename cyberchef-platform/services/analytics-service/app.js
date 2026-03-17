require('dotenv').config();
const express = require('express');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();
app.use(express.json());

app.use('/api/analytics', analyticsRoutes);

const PORT = process.env.PORT || 5005;
app.listen(PORT, () => {
  console.log(`Analytics Service running on port ${PORT}`);
});
