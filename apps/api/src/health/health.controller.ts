import { Controller, Get } from '@nestjs/common'
import { HealthService } from './health.service'
import { healthResponseSchema } from '@pit-wall/api-contracts'

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check(): Promise<typeof healthResponseSchema._type> {
    return this.healthService.check()
  }
}