import { Injectable } from '@nestjs/common'
import { envSchema, type EnvConfig } from './config.schema'

@Injectable()
export class ConfigService {
  private readonly config: EnvConfig

  constructor(config: EnvConfig) {
    this.config = config
  }

  get<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
    return this.config[key]
  }

  getOrThrow<K extends keyof EnvConfig>(key: K): NonNullable<EnvConfig[K]> {
    const value = this.config[key]
    if (value === undefined || value === null) {
      throw new Error(`Configuration key "${String(key)}" is not set`)
    }
    return value as NonNullable<EnvConfig[K]>
  }
}