import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common'
import { z, ZodSchema, ZodError } from 'zod/v4'

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    try {
      return this.schema.parse(value)
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ')
        throw new BadRequestException(messages)
      }
      throw new BadRequestException('Validation failed')
    }
  }
}