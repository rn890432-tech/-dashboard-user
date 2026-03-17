// Share metadata endpoint
router.get('/job/:jobId/share-metadata', (req, res) => {
  const jobId = parseInt(req.params.jobId);
  const job = getJobStatus(jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({
    title: `Cooking Video for Recipe ${job.recipeId}`,
    hashtags: job.viralTags || ['#easyrecipes', '#homecooking', '#foodie']
  });
});
// Check video job status
router.get('/job/:jobId/status', (req, res) => {
  const jobId = parseInt(req.params.jobId);
  const job = getJobStatus(jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({ status: job.status, videoUrl: job.videoUrl });
});
const express = require('express');
const router = express.Router();
const { addVideoRenderJob, getJobStatus } = require('./videoRenderQueue');

// Video Generation Endpoint
router.post('/generate-recipe-video', async (req, res) => {
  const { recipeId, style } = req.body;
  // Add job to video_render_jobs queue
  const job = addVideoRenderJob(recipeId, style);
  res.json({ videoUrl: job.videoUrl, status: job.status, jobId: job.id });
});

module.exports = router;
