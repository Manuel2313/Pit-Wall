import { z } from 'zod/v4'

export const envSchema = z.object({
  DATABASE_URL: z.string().url().startsWith('postgresql://'),
  JWT_SECRET: z.string().min(32),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().url().default('http://localhost:4200'),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  STORAGE_PATH: z.string().default('./storage'),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  RESET_TOKEN_TTL_HOURS: z.coerce.number().int().positive().default(1),
})

export type EnvConfig = z.infer<typeof envSchema>