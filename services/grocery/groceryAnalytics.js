// Grocery Analytics Tracking
const events = [];

function trackGroceryEvent(event) {
  events.push({ ...event, timestamp: Date.now() });
}

module.exports = { trackGroceryEvent, events };
