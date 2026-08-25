import { z } from 'zod/v4'

export const resetSchema = z.object({
  token: z.string().min(32),
  password: z.string().min(8),
})

export type ResetDto = z.infer<typeof resetSchema>