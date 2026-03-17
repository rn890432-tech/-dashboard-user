require('dotenv').config();
const express = require('express');
const billingRoutes = require('./routes/billingRoutes');

const app = express();
app.use(express.json());

app.use('/api/billing', billingRoutes);

const PORT = process.env.PORT || 5004;
app.listen(PORT, () => {
  console.log(`Billing Service running on port ${PORT}`);
});
