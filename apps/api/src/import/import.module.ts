import { Module, Global } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MulterModule } from '@nestjs/platform-express'
import { Car } from '../database/entities/car.entity'
import { Track } from '../database/entities/track.entity'
import { Setup } from '../database/entities/setup.entity'
import { SetupVersion } from '../database/entities/setup-version.entity'
import { ImportService } from './import.service'
import { ImportController } from './import.controller'
import { ImportConfirmService } from './import-confirm.service'
import { ImportConfirmController } from './import-confirm.controller'
import { StorageModule } from '../storage/storage.module'

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Car, Track, Setup, SetupVersion]),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
    StorageModule,
  ],
  providers: [ImportService, ImportConfirmService],
  controllers: [ImportController, ImportConfirmController],
  exports: [ImportService, ImportConfirmService],
})
export class ImportModule {}