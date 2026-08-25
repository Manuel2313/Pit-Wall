import { z } from 'zod/v4'

export const recoverSchema = z.object({
  email: z.string().email(),
})

export type RecoverDto = z.infer<typeof recoverSchema>