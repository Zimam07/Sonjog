import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TMP_DIR = path.join(__dirname, '..', 'tmp', 'scheduled-uploads');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

let s3Client = null;
let S3_BUCKET = process.env.S3_BUCKET || '';

async function ensureS3() {
  if (s3Client) return true;
  try {
    const { S3Client } = await import('@aws-sdk/client-s3');
    s3Client = new S3Client({
      region: process.env.S3_REGION,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      },
    });
    S3_BUCKET = S3_BUCKET || process.env.S3_BUCKET;
    return true;
  } catch (e) {
    // AWS SDK not installed or not configured — fallback to local
    s3Client = null;
    return false;
  }
}

export async function saveTemp(buffer, filename) {
  // If S3 is configured, upload there as a temporary object (with prefix tmp/)
  const useS3 = await ensureS3();
  if (useS3 && s3Client && S3_BUCKET) {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const key = `tmp/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${filename}`;
    await s3Client.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body: buffer }));
    return { type: 's3', path: key };
  }

  const tmpName = `story-${Date.now()}-${Math.random().toString(36).slice(2,8)}-${filename}`;
  const tmpPath = path.join(TMP_DIR, tmpName);
  fs.writeFileSync(tmpPath, buffer);
  return { type: 'file', path: tmpPath };
}

export async function uploadTempToCloud(tempRef) {
  // If tempRef is s3 key, return S3 public URL (or download and upload to cloudinary)
  // For simplicity, if S3 used we will download object and return buffer for cloudinary upload.
  // allow legacy string path (tests or older docs may set tempPath to a simple path)
  if (typeof tempRef === 'string') {
    const buf = fs.readFileSync(tempRef);
    return buf;
  }
  if (tempRef.type === 's3') {
    if (!s3Client) await ensureS3();
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const stream = await s3Client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: tempRef.path }));
    const chunks = [];
    for await (const chunk of stream.Body) chunks.push(chunk);
    return Buffer.concat(chunks);
  }
  // file path
  const buf = fs.readFileSync(tempRef.path);
  return buf;
}

export async function deleteTemp(tempRef) {
  if (!tempRef) return;
  // allow legacy string path
  if (typeof tempRef === 'string') {
    try { fs.unlinkSync(tempRef); } catch (e) {}
    return;
  }
  if (tempRef.type === 's3') {
    if (!s3Client) return;
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    try { await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: tempRef.path })); } catch (e) {}
    return;
  }
  try { fs.unlinkSync(tempRef.path); } catch (e) {}
}

export function tmpDir() { return TMP_DIR; }

export default { saveTemp, uploadTempToCloud, deleteTemp, tmpDir };
