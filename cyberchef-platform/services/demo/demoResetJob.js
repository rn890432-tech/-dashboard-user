const { resetDemoData } = require('./seedDemoData');

function startDemoResetJob() {
  setInterval(() => {
    resetDemoData();
    console.log('Demo data reset.');
  }, 30 * 60 * 1000); // 30 minutes
}

module.exports = { startDemoResetJob };
