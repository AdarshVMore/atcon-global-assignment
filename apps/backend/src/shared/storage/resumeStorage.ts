import { config } from "../../config/env.ts";

const bucket = new Bun.S3Client({
  accessKeyId: config.s3AccessKeyId,
  secretAccessKey: config.s3SecretAccessKey,
  bucket: config.s3Bucket,
  endpoint: config.s3Endpoint,
  region: config.s3Region,
});

export class ResumeStorage {
  hash(data: Uint8Array): string {
    const hasher = new Bun.CryptoHasher("sha256");
    hasher.update(data);
    return hasher.digest("hex");
  }

  buildKey(candidateId: string, fileName: string): string {
    return `resumes/${candidateId}/${crypto.randomUUID()}-${fileName}`;
  }

  async upload(key: string, data: Uint8Array, contentType: string): Promise<void> {
    await bucket.write(key, data, { type: contentType });
  }

  async delete(key: string): Promise<void> {
    await bucket.unlink(key);
  }

  async download(key: string): Promise<Uint8Array> {
    const bytes = await bucket.file(key).arrayBuffer();
    return new Uint8Array(bytes);
  }
}
