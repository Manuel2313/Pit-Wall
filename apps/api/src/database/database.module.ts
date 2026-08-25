import { Module, Global, Provider } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DataSource, DataSourceOptions } from 'typeorm'
import { ConfigModule, ConfigService } from '../config'

const dataSourceProvider: Provider = {
  provide: DataSource,
  useFactory: async (configService: ConfigService) => {
    const options: DataSourceOptions = {
      type: 'postgres',
      url: configService.get('DATABASE_URL'),
      synchronize: false,
      logging: configService.get('NODE_ENV') === 'development',
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      migrationsTableName: 'migrations',
      ssl: configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
    }
    const dataSource = new DataSource(options)
    await dataSource.initialize()
    return dataSource
  },
  inject: [ConfigService],
}

@Global()
@Module({
  imports: [TypeOrmModule.forRootAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (configService: ConfigService) => {
      const options: DataSourceOptions = {
        type: 'postgres',
        url: configService.get('DATABASE_URL'),
        synchronize: false,
        logging: configService.get('NODE_ENV') === 'development',
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        migrationsTableName: 'migrations',
        ssl: configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
      }
      return options
    },
  })],
  providers: [dataSourceProvider],
  exports: [TypeOrmModule, DataSource],
})
export class DatabaseModule {}