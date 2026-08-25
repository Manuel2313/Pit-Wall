import { Module, Global } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Car } from '../database/entities/car.entity'
import { Track } from '../database/entities/track.entity'
import { CatalogService } from './catalog.service'
import { CatalogController } from './catalog.controller'

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Car, Track])],
  providers: [CatalogService],
  controllers: [CatalogController],
  exports: [CatalogService],
})
export class CatalogModule {}