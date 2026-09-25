import { Controller, Get, Param, Query, Request, UseGuards } from '@nestjs/common'
import { AuthGuard } from '../auth/auth.guard'
import { SetupsService } from './setups.service'
import { ZodValidationPipe } from '../pipes/zod-validation.pipe'
import { setupListQuerySchema } from '@pit-wall/api-contracts'
import type { SetupListItem, SetupDetail, SetupListQuery } from '@pit-wall/api-contracts'

interface RequestWithUser extends Request {
  user: { id: string; email: string }
}

@Controller('setups')
@UseGuards(AuthGuard)
export class SetupsController {
  constructor(private readonly setupsService: SetupsService) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(setupListQuerySchema)) query: SetupListQuery,
    @Request() req: RequestWithUser,
  ): Promise<SetupListItem[]> {
    return this.setupsService.listForUser(req.user.id, query)
  }

  @Get(':id')
  async getById(
    @Param('id') setupId: string,
    @Request() req: RequestWithUser,
  ): Promise<SetupDetail> {
    return this.setupsService.getByIdForUser(setupId, req.user.id)
  }
}
