import { Module } from '@nestjs/common'
import { ConfigModule } from './config/config.module'
import { DatabaseModule } from './database/database.module'
import { HealthModule } from './health/health.module'
import { StorageModule } from './storage/storage.module'
import { AuthModule } from './auth/auth.module'
import { CatalogModule } from './catalog/catalog.module'
import { ImportModule } from './import/import.module'
import { SetupsModule } from './setups/setups.module'
import { VersionsModule } from './versions/versions.module'
import { FeedbackModule } from './feedback/feedback.module'
import { ExportModule } from './export/export.module'
import { TagsModule } from './tags/tags.module'

@Module({
  imports: [
    ConfigModule.forRoot(),
    DatabaseModule,
    HealthModule,
    StorageModule.forRoot(),
    AuthModule,
    CatalogModule,
    ImportModule,
    VersionsModule,
    TagsModule,
    FeedbackModule,
    SetupsModule,
    ExportModule,
  ],
})
export class AppModule {}