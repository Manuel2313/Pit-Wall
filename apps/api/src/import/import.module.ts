import { Module, Global } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MulterModule } from '@nestjs/platform-express'
import { Car } from '../database/entities/car.entity'
import { Track } from '../database/entities/track.entity'
import { ImportService } from './import.service'
import { ImportController } from './import.controller'
import { StorageModule } from '../storage/storage.module'

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Car, Track]),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
    StorageModule,
  ],
  providers: [ImportService],
  controllers: [ImportController],
  exports: [ImportService],
})
export class ImportModule {}