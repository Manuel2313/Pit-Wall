import { Controller, Get, Param, Query, UseGuards, Request, NotFoundException, BadRequestException } from '@nestjs/common'
import { AuthGuard } from '../auth/auth.guard'
import { VersionsService } from './versions.service'
import type { VersionSummary, TypedDiffResponse, ByteDiffResponse, DiffRequest } from '@pit-wall/api-contracts'
import { diffRequestSchema } from '@pit-wall/api-contracts'

interface RequestWithUser extends Request {
  user: { id: string; email: string }
}

@Controller('setups')
@UseGuards(AuthGuard)
export class VersionsController {
  constructor(private readonly versionsService: VersionsService) {}

  @Get(':id/versions')
  async listVersions(
    @Param('id') setupId: string,
    @Request() req: RequestWithUser,
  ): Promise<VersionSummary[]> {
    return this.versionsService.listVersions(setupId, req.user.id)
  }

  @Get('diff')
  async diff(
    @Query() query: DiffRequest,
    @Request() req: RequestWithUser,
  ): Promise<TypedDiffResponse | ByteDiffResponse> {
    // Validate query params using Zod schema
    const result = diffRequestSchema.safeParse(query)
    if (!result.success) {
      const messages = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
      throw new BadRequestException(messages)
    }

    const { fromVersion, toVersion } = result.data

    try {
      return await this.versionsService.diff(fromVersion, toVersion, req.user.id)
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error
      }
      throw new NotFoundException('Version not found or access denied')
    }
  }
}