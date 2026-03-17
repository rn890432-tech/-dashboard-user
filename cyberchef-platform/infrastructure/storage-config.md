# Cloud Storage Integration

## Storage Buckets
- recipe-images: for recipe images
- recipe-videos: for recipe videos
- ai-videos: for AI-generated videos

## Structure
- /storage/images/recipe-images/{recipeId}.jpg
- /storage/videos/recipe-videos/{recipeId}.mp4
- /storage/videos/ai-videos/{videoId}.mp4

## Steps
1. Create buckets in AWS S3, GCP, or Azure Blob.
2. Set permissions for backend services to upload/read.
3. Store bucket names and access keys in .env.production.
4. Use SDK (aws-sdk, @azure/storage-blob, etc.) in backend for file operations.
