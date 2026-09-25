import { Controller, Post, UseGuards, UseInterceptors, UploadedFiles, Body, Request, BadRequestException } from '@nestjs/common'
import { FileFieldsInterceptor } from '@nestjs/platform-express'
import { AuthGuard } from '../auth/auth.guard'
import { ImportConfirmService } from './import-confirm.service'
import { importConfirmRequestSchema } from '@pit-wall/api-contracts'
import type { ImportConfirmResponse } from '@pit-wall/api-contracts'

interface RequestWithUser extends Request {
  user: { id: string; email: string }
}

interface RawConfirmBody {
  metadata?: string
  sha256?: string
  htmlOverlay?: string
  manualOverlay?: string
}

function parseJsonField<T>(fieldName: string, raw: string | undefined): T | undefined {
  if (raw === undefined || raw === '') return undefined
  try {
    return JSON.parse(raw) as T
  } catch {
    throw new BadRequestException(`Invalid JSON in field "${fieldName}"`)
  }
}

@Controller('setups')
@UseGuards(AuthGuard)
export class ImportConfirmController {
  constructor(private readonly confirmService: ImportConfirmService) {}

  @Post('confirm')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'htmlFile', maxCount: 1 },
    ]),
  )
  async confirm(
    @UploadedFiles() files: { file?: Express.Multer.File[]; htmlFile?: Express.Multer.File[] },
    @Body() body: RawConfirmBody,
    @Request() req: RequestWithUser,
  ): Promise<ImportConfirmResponse> {
    const stoFile = files.file?.[0]
    if (!stoFile) {
      throw new BadRequestException('No .sto file uploaded')
    }

    const parsed = {
      metadata: parseJsonField('metadata', body.metadata),
      sha256: body.sha256,
      htmlOverlay: parseJsonField('htmlOverlay', body.htmlOverlay),
      manualOverlay: parseJsonField('manualOverlay', body.manualOverlay),
    }

    const result = importConfirmRequestSchema.safeParse(parsed)
    if (!result.success) {
      const messages = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
      throw new BadRequestException(messages)
    }

    return this.confirmService.confirm(req.user.id, result.data, stoFile.buffer)
  }
}