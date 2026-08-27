import { Module } from '@nestjs/common'
import { ConfigModule } from './config/config.module'
import { DatabaseModule } from './database/database.module'
import { HealthModule } from './health/health.module'
import { StorageModule } from './storage/storage.module'
import { AuthModule } from './auth/auth.module'
import { CatalogModule } from './catalog/catalog.module'
import { ImportModule } from './import/import.module'
import { VersionsModule } from './versions/versions.module'

@Module({
  imports: [ConfigModule.forRoot(), DatabaseModule, HealthModule, StorageModule.forRoot(), AuthModule, CatalogModule, ImportModule, VersionsModule],
})
export class AppModule {}