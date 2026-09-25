import { DataSource, DataSourceOptions } from 'typeorm'
import { ConfigService } from '../config/config.service'
import {
  User,
  Session,
  ResetToken,
  Car,
  Track,
  Setup,
  SetupVersion,
  FeedbackEntry,
  Tag,
  SetupTag,
} from './entities'
import { InitialSchema1725000000000 } from './migrations/1725000000000-InitialSchema'
import { SnakeNamingStrategy } from './snake-naming-strategy'

export const createDataSourceOptions = (configService: ConfigService): DataSourceOptions => ({
  type: 'postgres',
  url: configService.get('DATABASE_URL'),
  synchronize: false,
  logging: configService.get('NODE_ENV') === 'development',
  namingStrategy: new SnakeNamingStrategy(),
  // Explicit class lists (not globs): under the webpack bundle, __dirname-based
  // globs cannot see entities compiled into dist/main.js.
  entities: [User, Session, ResetToken, Car, Track, Setup, SetupVersion, FeedbackEntry, Tag, SetupTag],
  migrations: [InitialSchema1725000000000],
  migrationsTableName: 'migrations',
  ssl: configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
})

export const createDataSource = (configService: ConfigService): DataSource => {
  return new DataSource(createDataSourceOptions(configService))
}