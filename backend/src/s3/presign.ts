import { loadConfig } from "../config.js";

// Mocking S3 presigned URLs for local testing without AWS credentials
export async function presignUpload(key: string, contentType: string, expiresInSeconds = 300) {
  const cfg = loadConfig();
  // Return a dummy endpoint that works locally
  return { 
    url: `http://localhost:4001/mock-s3-upload?key=${encodeURIComponent(key)}`, 
    key, 
    bucket: cfg.S3_BUCKET, 
    expiresInSeconds 
  };
}

export async function presignDownload(key: string, expiresInSeconds = 300) {
  const cfg = loadConfig();
  return { 
    url: `http://localhost:4001/mock-s3-download?key=${encodeURIComponent(key)}`, 
    key, 
    bucket: cfg.S3_BUCKET, 
    expiresInSeconds 
  };
}

