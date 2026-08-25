import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { DataSource } from 'typeorm'
import { newDb } from 'pg-mem'
import { HealthService } from '../src/health/health.service'

describe('Health service', () => {
  let dataSource: DataSource
  let healthService: HealthService

  beforeAll(async () => {
    const pgMem = newDb({ autoCreateForeignKeyIndices: true })
    pgMem.public.registerFunction({
      name: 'gen_random_uuid',
      implementation: () => crypto.randomUUID(),
    })
    pgMem.public.registerFunction({
      name: 'version',
      implementation: () => 'PostgreSQL 16.0 (pg-mem)',
    })
    pgMem.public.registerFunction({
      name: 'current_database',
      implementation: () => 'test_db',
    })
    pgMem.public.registerFunction({
      name: 'current_user',
      implementation: () => 'test_user',
    })
    pgMem.public.registerFunction({
      name: 'current_setting',
      implementation: (setting: string) => {
        if (setting === 'server_version_num') return '160000'
        return ''
      },
    })

    dataSource = await pgMem.adapters.createTypeormDataSource({
      type: 'postgres',
      entities: [],
      synchronize: true,
    })

    await dataSource.initialize()

    healthService = new HealthService(dataSource)
  })

  afterAll(async () => {
    await dataSource.destroy()
  })

  it('check() returns ok status when database is reachable', async () => {
    const result = await healthService.check()
    expect(result).toMatchObject({
      status: 'ok',
      db: true,
    })
  })
})