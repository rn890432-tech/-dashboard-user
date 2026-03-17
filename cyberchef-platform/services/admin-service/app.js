require('dotenv').config();
const express = require('express');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
app.use(express.json());

app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 5006;
app.listen(PORT, () => {
  console.log(`Admin Service running on port ${PORT}`);
});
