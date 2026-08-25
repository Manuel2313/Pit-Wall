import { Controller, Get } from '@nestjs/common'
import { CatalogService } from './catalog.service'
import { catalogCarsResponseSchema, catalogTracksResponseSchema } from '@pit-wall/api-contracts'

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('cars')
  async getCars(): Promise<z.infer<typeof catalogCarsResponseSchema>> {
    return this.catalogService.getCars()
  }

  @Get('tracks')
  async getTracks(): Promise<z.infer<typeof catalogTracksResponseSchema>> {
    return this.catalogService.getTracks()
  }
}