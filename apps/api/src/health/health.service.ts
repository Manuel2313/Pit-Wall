import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { healthResponseSchema } from '@pit-wall/api-contracts'

@Injectable()
export class HealthService {
  constructor(private readonly dataSource: DataSource) {}

  async check(): Promise<typeof healthResponseSchema._type> {
    let db = false
    try {
      if (this.dataSource.isInitialized) {
        await this.dataSource.query('SELECT 1')
        db = true
      }
    } catch {
      db = false
    }
    return { status: db ? 'ok' : 'error', db }
  }
}