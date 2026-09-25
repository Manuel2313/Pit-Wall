import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, FindOptionsWhere } from 'typeorm'
import { Setup } from '../database/entities/setup.entity'
import { randomUUID } from 'crypto'

export interface CreateSetupInput {
  carId: string
  trackId: string
  condition: string
}

export interface UpdateSetupInput {
  condition?: string
}

@Injectable()
export class SetupRepository {
  constructor(@InjectRepository(Setup) private readonly repo: Repository<Setup>) {}

  async createForUser(userId: string, input: CreateSetupInput): Promise<Setup> {
    const setup = this.repo.create({
      id: randomUUID(),
      userId,
      carId: input.carId,
      trackId: input.trackId,
      condition: input.condition,
    })
    return this.repo.save(setup)
  }

  async findByUser(userId: string): Promise<Setup[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    })
  }

  async findByIdForUser(setupId: string, userId: string): Promise<Setup | null> {
    return this.repo.findOne({
      where: { id: setupId, userId },
    })
  }

  async updateForUser(setupId: string, userId: string, input: UpdateSetupInput): Promise<Setup> {
    const setup = await this.findByIdForUser(setupId, userId)
    if (!setup) {
      throw new Error('Setup not found or access denied')
    }
    Object.assign(setup, input)
    return this.repo.save(setup)
  }

  async deleteForUser(setupId: string, userId: string): Promise<boolean> {
    const result = await this.repo.delete({ id: setupId, userId })
    if (result.affected === 0) {
      throw new Error('Setup not found or access denied')
    }
    return true
  }

  async findOrCreateForUser(
    userId: string,
    carId: string,
    trackId: string,
    condition: string,
  ): Promise<Setup> {
    const existing = await this.repo.findOne({
      where: { userId, carId, trackId, condition },
    })
    if (existing) {
      return existing
    }
    return this.createForUser(userId, { carId, trackId, condition })
  }
}