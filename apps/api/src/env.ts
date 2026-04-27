import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  API_PORT: z.coerce.number().optional(),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_PRIVATE_KEY_BASE64: z.string().optional(),
  JWT_PUBLIC_KEY_BASE64: z.string().optional(),
  JWT_PRIVATE_KEY: z.string().optional(),
  JWT_PUBLIC_KEY: z.string().optional(),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  MAGIC_LINK_EXPIRES_SECONDS: z.coerce.number().default(900),
  EMAIL_PROVIDER: z.enum(['mock', 'smtp']).default('mock'),
  ADMIN_URL: z.string().default('http://localhost:3000'),
  CORS_ORIGINS: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),
});

function getRequired(parsed: z.infer<typeof envSchema>) {
  const privateKey = parsed.JWT_PRIVATE_KEY_BASE64 ?? parsed.JWT_PRIVATE_KEY;
  const publicKey = parsed.JWT_PUBLIC_KEY_BASE64 ?? parsed.JWT_PUBLIC_KEY;
  if (!privateKey) { console.error('Missing JWT private key (JWT_PRIVATE_KEY_BASE64 or JWT_PRIVATE_KEY)'); process.exit(1); }
  if (!publicKey) { console.error('Missing JWT public key (JWT_PUBLIC_KEY_BASE64 or JWT_PUBLIC_KEY)'); process.exit(1); }
  return {
    ...parsed,
    PORT: parsed.API_PORT ?? parsed.PORT,
    JWT_PRIVATE_KEY_BASE64: privateKey,
    JWT_PUBLIC_KEY_BASE64: publicKey,
    CORS_ORIGINS: parsed.CORS_ORIGINS ?? parsed.CORS_ORIGIN ?? 'http://localhost:3000',
  };
}

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = getRequired(parsed.data);
