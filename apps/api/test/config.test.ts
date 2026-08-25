import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ConfigService } from '../src/config/config.service'
import { envSchema } from '../src/config/config.schema'
import { Test } from '@nestjs/testing'

describe('Config validation', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should load valid configuration', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db'
    process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long'
    process.env.PORT = '3000'
    process.env.NODE_ENV = 'test'

    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: ConfigService,
          useFactory: () => {
            const parsed = envSchema.safeParse(process.env)
            if (!parsed.success) {
              const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
              throw new Error(`Configuration validation failed: ${errors}`)
            }
            return new ConfigService(parsed.data)
          },
        },
      ],
    }).compile()

    const configService = moduleRef.get(ConfigService)
    expect(configService.get('DATABASE_URL')).toBe('postgresql://user:pass@localhost:5432/db')
    expect(configService.get('JWT_SECRET')).toBe('test-secret-at-least-32-chars-long')
    expect(configService.get('PORT')).toBe(3000)
    expect(configService.get('NODE_ENV')).toBe('test')
  })

  it('should reject missing DATABASE_URL', async () => {
    delete process.env.DATABASE_URL
    process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long'
    process.env.PORT = '3000'
    process.env.NODE_ENV = 'test'

    const moduleRef = Test.createTestingModule({
      providers: [
        {
          provide: ConfigService,
          useFactory: () => {
            const parsed = envSchema.safeParse(process.env)
            if (!parsed.success) {
              const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
              throw new Error(`Configuration validation failed: ${errors}`)
            }
            return new ConfigService(parsed.data)
          },
        },
      ],
    })

    await expect(moduleRef.compile()).rejects.toThrow(/DATABASE_URL/)
  })

  it('should reject invalid DATABASE_URL', async () => {
    process.env.DATABASE_URL = 'invalid-url'
    process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long'
    process.env.PORT = '3000'
    process.env.NODE_ENV = 'test'

    const moduleRef = Test.createTestingModule({
      providers: [
        {
          provide: ConfigService,
          useFactory: () => {
            const parsed = envSchema.safeParse(process.env)
            if (!parsed.success) {
              const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
              throw new Error(`Configuration validation failed: ${errors}`)
            }
            return new ConfigService(parsed.data)
          },
        },
      ],
    })

    await expect(moduleRef.compile()).rejects.toThrow()
  })

  it('should reject short JWT_SECRET', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db'
    process.env.JWT_SECRET = 'short'
    process.env.PORT = '3000'
    process.env.NODE_ENV = 'test'

    const moduleRef = Test.createTestingModule({
      providers: [
        {
          provide: ConfigService,
          useFactory: () => {
            const parsed = envSchema.safeParse(process.env)
            if (!parsed.success) {
              const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
              throw new Error(`Configuration validation failed: ${errors}`)
            }
            return new ConfigService(parsed.data)
          },
        },
      ],
    })

    await expect(moduleRef.compile()).rejects.toThrow(/JWT_SECRET/)
  })
})