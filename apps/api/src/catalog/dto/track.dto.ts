import { z } from 'zod/v4'

/** Track response schema */
export const trackResponseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  layout: z.string().min(1),
  createdAt: z.iso.datetime(),
})

export type TrackResponse = z.infer<typeof trackResponseSchema>