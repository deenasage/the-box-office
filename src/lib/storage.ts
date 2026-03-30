// SPEC: core infrastructure
// Storage abstraction layer — wraps local filesystem operations.
//
// AWS-MIGRATION: To move file storage to Amazon S3:
//   1. npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
//   2. Set AWS_REGION, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
//   3. Replace each function body with the S3 equivalent shown in the comments below.
//
// All call sites import from this module — no other file needs to change.

import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

/** Absolute path of the local uploads root. */
export const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

/**
 * Write binary data to a path relative to UPLOADS_ROOT.
 * Creates parent directories as needed.
 *
 * AWS-MIGRATION replacement:
 *   const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
 *   const s3 = new S3Client({ region: process.env.AWS_REGION });
 *   await s3.send(new PutObjectCommand({
 *     Bucket: process.env.AWS_S3_BUCKET,
 *     Key: relativePath,
 *     Body: data,
 *   }));
 */
export async function storageWrite(relativePath: string, data: Buffer): Promise<void> {
  const fullPath = path.join(UPLOADS_ROOT, relativePath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, data);
}

/**
 * Read binary data from a path relative to UPLOADS_ROOT.
 *
 * AWS-MIGRATION replacement:
 *   const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
 *   const s3 = new S3Client({ region: process.env.AWS_REGION });
 *   const res = await s3.send(new GetObjectCommand({
 *     Bucket: process.env.AWS_S3_BUCKET,
 *     Key: relativePath,
 *   }));
 *   return Buffer.from(await res.Body!.transformToByteArray());
 */
export async function storageRead(relativePath: string): Promise<Buffer> {
  const fullPath = path.join(UPLOADS_ROOT, relativePath);
  return readFile(fullPath);
}

/**
 * Read binary data from an absolute stored path (legacy — prefer storageRead).
 * Used by routes that stored absolute paths in the database before this abstraction.
 *
 * AWS-MIGRATION: convert storedPath to a relative key by stripping UPLOADS_ROOT prefix,
 * then call storageRead(relativeKey).
 */
export async function storageReadAbsolute(storedPath: string): Promise<Buffer> {
  return readFile(storedPath);
}

/**
 * Delete a file by its absolute stored path.
 *
 * AWS-MIGRATION replacement:
 *   const relativeKey = storedPath.replace(UPLOADS_ROOT + path.sep, "");
 *   await s3.send(new DeleteObjectCommand({ Bucket: ..., Key: relativeKey }));
 */
export async function storageDelete(storedPath: string): Promise<void> {
  if (existsSync(storedPath)) {
    await unlink(storedPath);
  }
}

/**
 * Returns a URL clients can use to download a file.
 * Locally, this is a signed API route. On S3, this would be a pre-signed URL.
 *
 * AWS-MIGRATION replacement:
 *   const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
 *   return getSignedUrl(s3, new GetObjectCommand({ Bucket: ..., Key: relativeKey }), { expiresIn: 3600 });
 */
export function storageUrl(briefId: string, attachmentId: string): string {
  return `/api/briefs/${briefId}/attachments/${attachmentId}`;
}
