import { Controller, Post, UseGuards, UseInterceptors, UploadedFiles, Body, Request, BadRequestException } from '@nestjs/common'
import { FileFieldsInterceptor } from '@nestjs/platform-express'
import { AuthGuard } from '../auth/auth.guard'
import { ImportConfirmService } from './import-confirm.service'
import type { ImportConfirmRequest, ImportConfirmResponse } from '@pit-wall/api-contracts'

interface RequestWithUser extends Request {
  user: { id: string; email: string }
}

@Controller('setups')
@UseGuards(AuthGuard)
export class ImportConfirmController {
  constructor(private readonly confirmService: ImportConfirmService) {}

  @Post('confirm')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },      // .sto file (required)
      { name: 'htmlFile', maxCount: 1 },  // optional .htm
    ]),
  )
  async confirm(
    @UploadedFiles() files: { file?: Express.Multer.File[]; htmlFile?: Express.Multer.File[] },
    @Body() dto: ImportConfirmRequest,
    @Request() req: RequestWithUser,
  ): Promise<ImportConfirmResponse> {
    const stoFile = files.file?.[0]
    if (!stoFile) {
      throw new BadRequestException('No .sto file uploaded')
    }

    return this.confirmService.confirm(req.user.id, dto, stoFile.buffer)
  }
}