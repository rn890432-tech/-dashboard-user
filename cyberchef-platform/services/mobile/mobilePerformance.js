const compression = require('compression');

function setupPerformance(app) {
  app.use(compression());
  app.use((req, res, next) => {
    res.set('Cache-Control', 'public, max-age=600');
    next();
  });
}

module.exports = { setupPerformance };
