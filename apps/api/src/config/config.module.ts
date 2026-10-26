import { DynamicModule, Global, Module, Provider } from '@nestjs/common'
import { resolve } from 'path'
import { config as loadDotenv } from 'dotenv'
import { ConfigService } from './config.service'
import { envSchema } from './config.schema'

// Load apps/api/.env before validating process.env.
// cwd is apps/api when started via npm scripts; also try repo-root relative path.
// .env.local overrides .env for local-only values (e.g. DISABLE_THROTTLE in E2E).
loadDotenv({ path: resolve(process.cwd(), '.env.local'), override: true })
loadDotenv()
if (!process.env.DATABASE_URL) {
  loadDotenv({ path: resolve(process.cwd(), 'apps/api/.env.local'), override: true })
  loadDotenv({ path: resolve(process.cwd(), 'apps/api/.env') })
}

@Global()
@Module({})
export class ConfigModule {
  static forRoot(): DynamicModule {
    const configServiceProvider: Provider = {
      provide: ConfigService,
      useFactory: () => {
        const parsed = envSchema.safeParse(process.env)
        if (!parsed.success) {
          const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
          throw new Error(`Configuration validation failed: ${errors}`)
        }
        return new ConfigService(parsed.data)
      },
    }

    return {
      module: ConfigModule,
      providers: [configServiceProvider],
      exports: [ConfigService],
    }
  }
}