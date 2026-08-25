import { Injectable } from '@nestjs/common'
import { Repository } from 'typeorm'
import { ResetToken } from '../database/entities/reset-token.entity'

@Injectable()
export class ResetTokenRepository {
  constructor(private readonly repo: Repository<ResetToken>) {}

  async create(userId: string, tokenHash: string, expiresAt: Date): Promise<ResetToken> {
    const resetToken = this.repo.create({ userId, tokenHash, expiresAt, used: false })
    return this.repo.save(resetToken)
  }

  async findValidByTokenHash(tokenHash: string): Promise<ResetToken | null> {
    const now = new Date()
    const resetToken = await this.repo.findOne({
      where: { tokenHash },
      relations: ['user'],
    })
    if (!resetToken) return null
    if (resetToken.expiresAt < now) return null
    if (resetToken.used) return null
    return resetToken
  }

  async markUsed(id: string): Promise<void> {
    await this.repo.update(id, { used: true })
  }
}