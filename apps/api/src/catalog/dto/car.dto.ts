import { z } from 'zod/v4'

/** Car category enum - GT3 or Porsche Cup only (per PRD) */
export const carCategorySchema = z.enum(['GT3', 'Porsche Cup'])

/** Car response schema */
export const carResponseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: carCategorySchema,
  createdAt: z.iso.datetime(),
})

export type CarCategory = z.infer<typeof carCategorySchema>
export type CarResponse = z.infer<typeof carResponseSchema>