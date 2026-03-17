const redis = require('redis');
const client = redis.createClient({ url: process.env.REDIS_URL });
client.connect();

async function getCachedVideo(recipeId) {
  return await client.get(`video:${recipeId}`);
}

async function setCachedVideo(recipeId, videoUrl) {
  await client.set(`video:${recipeId}`, videoUrl, { EX: 86400 }); // 1 day
}

module.exports = { getCachedVideo, setCachedVideo };
