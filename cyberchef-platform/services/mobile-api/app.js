const express = require('express');
const app = express();
app.use(express.json());

const mobileRoutes = require('./routes/index');
app.use('/api/mobile', mobileRoutes);

const PORT = process.env.PORT || 5010;
app.listen(PORT, () => {
  console.log(`Mobile API running on port ${PORT}`);
});
