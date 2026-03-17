const AWS = require('aws-sdk');
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

async function uploadToStorage(localPath, storagePath) {
  // Upload video to S3 and return public URL
  const fileContent = require('fs').readFileSync(localPath);
  const params = {
    Bucket: process.env.AWS_BUCKET,
    Key: storagePath.replace(/^\//, ''),
    Body: fileContent,
    ACL: 'public-read',
    ContentType: 'video/mp4'
  };
  await s3.upload(params).promise();
  return `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
}

module.exports = { uploadToStorage };
