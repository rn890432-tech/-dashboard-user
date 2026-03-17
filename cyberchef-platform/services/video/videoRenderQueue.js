// Video Render Job Queue (Stub)
// In production, use Bull, Redis, or similar
const videoRenderJobs = [];

function addVideoRenderJob(recipeId, style) {
  // Stub: Retrieve recipe data, generate scenes, create visuals, add overlays, narration, render video
  // TODO: Implement real pipeline
  const scenes = [
    { type: 'title', text: 'Recipe Title' },
    { type: 'ingredients', text: 'Ingredients List' },
    { type: 'step', text: 'Step 1' },
    { type: 'step', text: 'Step 2' },
    { type: 'final', text: 'Final Dish' }
  ];
  const videoTemplate = style || 'tiktok';
  const viralTags = ['#easyrecipes', '#homecooking', '#foodie'];
  const job = {
    id: videoRenderJobs.length + 1,
    recipeId,
    style,
    status: 'queued',
    videoUrl: `https://cdn.example.com/videos/recipes/${recipeId}/video.mp4`,
    createdAt: Date.now(),
    scenes,
    videoTemplate,
    viralTags
  };
  videoRenderJobs.push(job);
  return job;
}

function getJobStatus(jobId) {
  return videoRenderJobs.find(job => job.id === jobId);
}

module.exports = { addVideoRenderJob, getJobStatus, videoRenderJobs };
