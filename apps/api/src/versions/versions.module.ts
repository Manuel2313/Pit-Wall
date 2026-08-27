import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SetupVersion } from '../database/entities/setup-version.entity'
import { VersionsService } from './versions.service'
import { VersionsController } from './versions.controller'
import { StorageModule } from '../storage/storage.module'
import { SetupVersionRepository } from '../repositories/setup-version.repository'
import { SetupRepository } from '../repositories/setup.repository'
import { Setup } from '../database/entities/setup.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([SetupVersion, Setup]),
    StorageModule,
  ],
  providers: [VersionsService, SetupVersionRepository, SetupRepository],
  controllers: [VersionsController],
  exports: [VersionsService],
})
export class VersionsModule {}