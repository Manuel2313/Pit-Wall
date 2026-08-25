import { DataSource, DataSourceOptions } from 'typeorm'
import { ConfigService } from '../config/config.service'

export const createDataSourceOptions = (configService: ConfigService): DataSourceOptions => ({
  type: 'postgres',
  url: configService.get('DATABASE_URL'),
  synchronize: false,
  logging: configService.get('NODE_ENV') === 'development',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations',
  ssl: configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
})

export const createDataSource = (configService: ConfigService): DataSource => {
  return new DataSource(createDataSourceOptions(configService))
}