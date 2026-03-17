module.exports = {
  url: process.env.REDIS_URL,
  options: {
    retry_strategy: options => Math.min(options.attempt * 100, 3000)
  }
};
