import { loginRequestSchema } from '@pit-wall/api-contracts'

export const loginSchema = loginRequestSchema

export type LoginDto = typeof loginRequestSchema._output