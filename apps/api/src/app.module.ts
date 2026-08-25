import { Module } from '@nestjs/common'
import { ConfigModule } from './config/config.module'
import { DatabaseModule } from './database/database.module'
import { HealthModule } from './health/health.module'
import { StorageModule } from './storage/storage.module'

@Module({
  imports: [ConfigModule.forRoot(), DatabaseModule, HealthModule, StorageModule.forRoot()],
})
export class AppModule {}