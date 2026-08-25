import { z } from 'zod/v4'

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export type RegisterDto = z.infer<typeof registerSchema>