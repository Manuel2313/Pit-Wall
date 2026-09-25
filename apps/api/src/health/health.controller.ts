import { Controller, Get } from '@nestjs/common'
import { HealthService } from './health.service'
import type { HealthResponse } from '@pit-wall/api-contracts'

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check(): Promise<HealthResponse> {
    return this.healthService.check()
  }
}