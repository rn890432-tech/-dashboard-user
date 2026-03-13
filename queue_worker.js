// Example queue + worker setup using Bull (Redis)
const Queue = require('bull');

// Email retry queue
const emailQueue = new Queue('emailRetry', 'redis://127.0.0.1:6379');

emailQueue.process(async (job) => {
  // Retry sending email
  // ...existing code...
  return { status: 'done' };
});

// SOC alert queue
const alertQueue = new Queue('socAlert', 'redis://127.0.0.1:6379');

alertQueue.process(async (job) => {
  // Process SOC alert
  // ...existing code...
  return { status: 'done' };
});

// Add job example
// emailQueue.add({ email_id: 'uuid', retry_count: 1 });
// alertQueue.add({ alert_id: 'uuid', status: 'Open' });

module.exports = { emailQueue, alertQueue };
