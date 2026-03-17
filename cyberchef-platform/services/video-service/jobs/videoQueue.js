const Queue = require('bull');
const videoQueue = new Queue('video-generation', process.env.REDIS_URL);

async function enqueueVideoJob(jobData) {
  await videoQueue.add(jobData);
}

module.exports = { videoQueue, enqueueVideoJob };
