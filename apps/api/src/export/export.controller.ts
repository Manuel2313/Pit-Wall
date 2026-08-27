import { Controller, Get, Param, Request, UseGuards, Res, HttpStatus } from '@nestjs/common'
import { Response } from 'express'
import { AuthGuard } from '../auth/auth.guard'
import { ExportService } from './export.service'
import type { ExportResponse } from '@pit-wall/api-contracts'

interface RequestWithUser extends Request {
  user: { id: string; email: string }
}

@Controller('versions')
@UseGuards(AuthGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get(':vid/file')
  async exportFile(
    @Param('vid') versionId: string,
    @Request() req: RequestWithUser,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const result = await this.exportService.exportFile(versionId, req.user.id)

      const response: ExportResponse = {
        success: true,
        sha256: result.sha256,
        filename: result.filename,
      }

      res.setHeader('Content-Type', 'application/octet-stream')
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`)
      res.setHeader('Content-Length', result.buffer.length)
      res.setHeader('X-File-SHA256', result.sha256)
      res.setHeader('X-File-Name', result.filename)

      res.status(HttpStatus.OK).send(result.buffer)
    } catch (error) {
      if (error instanceof BadRequestException) {
        const response: ExportResponse = {
          success: false,
          error: error.message,
        }
        res.status(HttpStatus.NOT_FOUND).json(response)
        return
      }
      if (error instanceof NotFoundException) {
        const response: ExportResponse = {
          success: false,
          error: error.message,
        }
        res.status(HttpStatus.NOT_FOUND).json(response)
        return
      }
      throw error
    }
  }
}