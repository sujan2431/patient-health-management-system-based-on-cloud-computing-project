import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { loadConfig } from "../config.js";
let s3 = null;
function getDeps() {
    const cfg = loadConfig();
    if (!s3)
        s3 = new S3Client({ region: cfg.AWS_REGION });
    return { cfg, s3 };
}
export async function presignUpload(key, contentType, expiresInSeconds = 300) {
    const { cfg, s3 } = getDeps();
    const cmd = new PutObjectCommand({
        Bucket: cfg.S3_BUCKET,
        Key: key,
        ContentType: contentType,
        ServerSideEncryption: "AES256"
    });
    const url = await getSignedUrl(s3, cmd, { expiresIn: expiresInSeconds });
    return { url, key, bucket: cfg.S3_BUCKET, expiresInSeconds };
}
export async function presignDownload(key, expiresInSeconds = 300) {
    const { cfg, s3 } = getDeps();
    const cmd = new GetObjectCommand({
        Bucket: cfg.S3_BUCKET,
        Key: key
    });
    const url = await getSignedUrl(s3, cmd, { expiresIn: expiresInSeconds });
    return { url, key, bucket: cfg.S3_BUCKET, expiresInSeconds };
}
