import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, LessThan, MoreThan } from 'typeorm'
import { Session } from '../database/entities/session.entity'

@Injectable()
export class SessionRepository {
  constructor(@InjectRepository(Session) private readonly repo: Repository<Session>) {}

  async create(userId: string, tokenHash: string, expiresAt: Date): Promise<Session> {
    const session = this.repo.create({ userId, tokenHash, expiresAt })
    return this.repo.save(session)
  }

  async findValidByTokenHash(tokenHash: string): Promise<Session | null> {
    return this.repo.findOne({
      where: { tokenHash, expiresAt: MoreThan(new Date()) },
      relations: ['user'],
    })
  }

  async deleteByTokenHash(tokenHash: string): Promise<boolean> {
    const result = await this.repo.delete({ tokenHash })
    return (result.affected ?? 0) > 0
  }

  async deleteByUserId(userId: string): Promise<number> {
    const result = await this.repo.delete({ userId })
    return result.affected ?? 0
  }

  async deleteExpired(): Promise<number> {
    const now = new Date()
    const result = await this.repo.delete({ expiresAt: LessThan(now) })
    return result.affected ?? 0
  }
}