export interface AppConfig {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  redisUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  s3Endpoint: string;
  s3Region: string;
  s3Bucket: string;
  s3AccessKeyId: string;
  s3SecretAccessKey: string;
  /** Empty when unset — LLM-dependent features degrade gracefully rather than requiring it at startup. */
  openRouterApiKey: string;
  openRouterModel: string;
  openRouterEmbeddingModel: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config: AppConfig = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: requireEnv("DATABASE_URL"),
  redisUrl: requireEnv("REDIS_URL"),
  jwtSecret: requireEnv("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1d",
  s3Endpoint: requireEnv("S3_ENDPOINT"),
  s3Region: requireEnv("S3_REGION"),
  s3Bucket: requireEnv("S3_BUCKET"),
  s3AccessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
  s3SecretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  openRouterModel: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
  openRouterEmbeddingModel: process.env.OPENROUTER_EMBEDDING_MODEL || "openai/text-embedding-3-small",
};
