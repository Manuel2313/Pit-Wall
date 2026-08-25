import { Controller, Post, UseGuards, UseInterceptors, UploadedFiles, Request, BadRequestException } from '@nestjs/common'
import { FileFieldsInterceptor } from '@nestjs/platform-express'
import { AuthGuard } from '../auth/auth.guard'
import { ImportService } from './import.service'
import type { ImportPreviewResponse } from '@pit-wall/api-contracts'

interface RequestWithUser extends Request {
  user: { id: string; email: string }
}

@Controller('setups')
@UseGuards(AuthGuard)
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'htmlFile', maxCount: 1 },
    ]),
  )
  async preview(
    @UploadedFiles() files: { file?: Express.Multer.File[]; htmlFile?: Express.Multer.File[] },
    @Request() req: RequestWithUser,
  ): Promise<ImportPreviewResponse> {
    const file = files.file?.[0]
    if (!file) {
      throw new BadRequestException('No .sto file uploaded')
    }
    return this.importService.preview(file, files.htmlFile?.[0])
  }
}