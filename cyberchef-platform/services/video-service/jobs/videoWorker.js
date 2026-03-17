const { videoQueue } = require('./videoQueue');
const Recipe = require('../models/Recipe');
const { generateScenes, generateImages, assembleVideo } = require('../utils/videoPipeline');
const { uploadToStorage } = require('../utils/storage');
const VideoStatus = require('./videoStatus');
const { setCachedVideo } = require('../utils/cache');
const logger = require('../utils/logger');

videoQueue.process(async (job) => {
  const { recipeId, style } = job.data;
  let status = await VideoStatus.findOne({ recipeId });
  if (!status) status = await VideoStatus.create({ recipeId, status: 'processing' });
  else {
    status.status = 'processing';
    status.updatedAt = new Date();
    await status.save();
  }
  try {
    const recipe = await Recipe.findById(recipeId);
    if (!recipe) throw new Error('Recipe not found');
    const scenes = generateScenes(recipe.ingredients, recipe.steps, style);
    const images = await generateImages(scenes);
    const videoPath = await assembleVideo(images, recipe.steps, style);
    const storagePath = `/recipes/videos/${recipeId}/video.mp4`;
    const videoUrl = await uploadToStorage(videoPath, storagePath);
    recipe.videoUrl = videoUrl;
    await recipe.save();
    status.status = 'completed';
    status.videoUrl = videoUrl;
    status.updatedAt = new Date();
    await status.save();
    await setCachedVideo(recipeId, videoUrl);
    logger.info(`Video completed for recipe ${recipeId}`);
  } catch (err) {
    status.status = 'failed';
    status.error = err.message;
    status.updatedAt = new Date();
    await status.save();
    logger.error(`Video failed for recipe ${recipeId}: ${err.message}`);
    throw err;
  }
});
