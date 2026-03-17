// Redis Caching for Grocery Lists
const redis = require('redis');
const client = redis.createClient();

function cacheGroceryList(key, list) {
  client.setex(key, 1800, JSON.stringify(list)); // 30 min expiration
}

function getCachedGroceryList(key, cb) {
  client.get(key, (err, data) => {
    if (err || !data) return cb(null);
    cb(JSON.parse(data));
  });
}

module.exports = { cacheGroceryList, getCachedGroceryList };
