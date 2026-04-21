import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  API_PORT: z.coerce.number().default(3001),
  API_BASE_URL: z.string().url().default('http://localhost:3001'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  JWT_PRIVATE_KEY: z.string(),
  JWT_PUBLIC_KEY: z.string(),
  JWT_ACCESS_TTL: z.coerce.number().default(900),
  JWT_REFRESH_TTL: z.coerce.number().default(604800),
  MAGIC_LINK_TTL: z.coerce.number().default(600),
  MAGIC_LINK_BASE_URL: z.string().default('http://localhost:3000/verify'),
  EMAIL_PROVIDER: z.enum(['resend', 'smtp', 'mock']).default('mock'),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('MedSoft <noreply@aivita.uz>'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  TOTP_ISSUER: z.string().default('MedSoft'),
  TOTP_LABEL: z.string().default('aivita.uz'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
