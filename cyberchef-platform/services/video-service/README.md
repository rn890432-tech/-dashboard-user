# Video Service Workflow Test

## Local Workflow

1. Start Redis and MongoDB:
   - `docker-compose up redis mongodb`

2. Start video-service worker:
   - `node jobs/videoWorker.js`

3. Start video-service API:
   - `node app.js`

4. Generate a recipe (via recipe-service or direct DB insert).

5. Generate a video:
   - POST `/api/ai/generate-recipe-video` with `{ recipeId, style }`

6. Check job status:
   - GET `/api/ai/generate-recipe-video/status/{recipeId}`

7. Fetch video:
   - GET `/api/videos/recipe/{recipeId}`

8. Share video:
   - POST `/api/videos/share` with `{ videoUrl, platform }`

## Verify
- Video is stored in S3 bucket `/recipes/videos/{recipeId}/video.mp4`
- Video URL is public and returned in API
- Recipe page displays video
- OpenGraph metadata renders for social sharing
- Logs are written to `video-service.log`
- Redis cache is used for video URLs
- Job status is tracked (queued, processing, completed, failed)

---

For production, set AWS credentials and bucket in `.env.production`.
