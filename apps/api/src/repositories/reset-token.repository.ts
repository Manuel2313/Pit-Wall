import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, MoreThan } from 'typeorm'
import { ResetToken } from '../database/entities/reset-token.entity'

@Injectable()
export class ResetTokenRepository {
  constructor(@InjectRepository(ResetToken) private readonly repo: Repository<ResetToken>) {}

  async create(userId: string, tokenHash: string, expiresAt: Date): Promise<ResetToken> {
    const resetToken = this.repo.create({ userId, tokenHash, expiresAt, used: false })
    return this.repo.save(resetToken)
  }

  async findValidByTokenHash(tokenHash: string): Promise<ResetToken | null> {
    return this.repo.findOne({
      where: { tokenHash, used: false, expiresAt: MoreThan(new Date()) },
      relations: ['user'],
    })
  }

  async markUsed(id: string): Promise<void> {
    await this.repo.update(id, { used: true })
  }
}