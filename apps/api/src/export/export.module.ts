import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SetupVersion } from '../database/entities/setup-version.entity'
import { Setup } from '../database/entities/setup.entity'
import { ExportService } from './export.service'
import { ExportController } from './export.controller'
import { SetupVersionRepository } from '../repositories/setup-version.repository'
import { SetupRepository } from '../repositories/setup.repository'
import { StorageModule } from '../storage/storage.module'

@Module({
  imports: [TypeOrmModule.forFeature([SetupVersion, Setup]), StorageModule],
  providers: [ExportService, SetupVersionRepository, SetupRepository],
  controllers: [ExportController],
  exports: [ExportService],
})
export class ExportModule {}