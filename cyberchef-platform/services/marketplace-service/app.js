const express = require('express');
const app = express();
app.use(express.json());

const marketplaceRoutes = require('./routes/marketplace');
app.use('/api/marketplace', marketplaceRoutes);

const PORT = process.env.PORT || 5011;
app.listen(PORT, () => {
  console.log(`Marketplace Service running on port ${PORT}`);
});
