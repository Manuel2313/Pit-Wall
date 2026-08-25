import { DynamicModule, Global, Module, Provider } from '@nestjs/common'
import { ConfigService } from './config.service'
import { envSchema } from './config.schema'

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