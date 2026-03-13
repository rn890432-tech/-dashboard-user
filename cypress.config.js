module.exports = {
  projectId: 'eb7imi',
  video: true,
  screenshotsFolder: 'cypress/screenshots',
  videosFolder: 'cypress/videos',
  env: {
    tags: 'dashboard,redteam,automation',
    apiToken: process.env.CYPRESS_API_TOKEN
  },
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/integration/**/*.js',
    supportFile: false
  }
};
