import { Injectable } from '@nestjs/common'
import { Repository } from 'typeorm'
import { SetupVersion } from '../database/entities/setup-version.entity'
import { SetupRepository } from './setup.repository'
import { randomUUID } from 'crypto'

export interface CreateVersionInput {
  versionNo: number
  parentVersionNo: number | null
  sha256: string
  overlay?: Record<string, Record<string, string>> | null
  fileRef: string
}

@Injectable()
export class SetupVersionRepository {
  constructor(
    private readonly repo: Repository<SetupVersion>,
    private readonly setupRepository: SetupRepository,
  ) {}

  async createForSetup(setupId: string, userId: string, input: CreateVersionInput): Promise<SetupVersion> {
    // Verify the setup belongs to the user
    const setup = await this.setupRepository.findByIdForUser(setupId, userId)
    if (!setup) {
      throw new Error('Setup not found or access denied')
    }

    const version = this.repo.create({
      id: randomUUID(),
      setupId,
      versionNo: input.versionNo,
      parentVersionNo: input.parentVersionNo,
      sha256: input.sha256,
      overlay: input.overlay ?? null,
      fileRef: input.fileRef,
    })
    return this.repo.save(version)
  }

  async findBySetupForUser(setupId: string, userId: string): Promise<SetupVersion[]> {
    // First verify the setup belongs to the user
    const setup = await this.setupRepository.findByIdForUser(setupId, userId)
    if (!setup) {
      return []
    }

    return this.repo.find({
      where: { setupId },
      order: { versionNo: 'ASC' },
    })
  }

  async findByIdForUser(versionId: string, userId: string): Promise<SetupVersion | null> {
    const version = await this.repo.findOne({
      where: { id: versionId },
      relations: ['setup'],
    })
    if (!version || version.setup.userId !== userId) {
      return null
    }
    return version
  }
}