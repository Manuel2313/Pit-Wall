import { Module, Global } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule, ConfigService } from '../config'
import { createDataSourceOptions } from './database.config'

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => createDataSourceOptions(configService),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
