const fs = require('fs');
const path = require('path');

function resetDemoData() {
  // Reset demo analytics
  fs.writeFileSync(path.join(__dirname, 'demoAnalytics.js'), `module.exports = {\n  sessionsStarted: 0,\n  featuresUsed: [],\n  conversions: 0\n};\n`);
}

module.exports = { resetDemoData };
