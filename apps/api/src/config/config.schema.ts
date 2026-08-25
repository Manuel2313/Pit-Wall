import { z } from 'zod/v4'

export const envSchema = z.object({
  DATABASE_URL: z.string().url().startsWith('postgresql://'),
  JWT_SECRET: z.string().min(32),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),
  STORAGE_PATH: z.string().default('./storage'),
})

export type EnvConfig = z.infer<typeof envSchema>