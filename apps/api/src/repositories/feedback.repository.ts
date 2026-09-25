import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { FeedbackEntry } from '../database/entities/feedback-entry.entity'
import { SetupVersion } from '../database/entities/setup-version.entity'
import { SetupVersionRepository } from './setup-version.repository'
import { randomUUID } from 'crypto'

export interface CreateFeedbackInput {
  text: string
  lapDeltaMs?: number | null
}

export interface UpdateFeedbackInput {
  text?: string
  lapDeltaMs?: number | null
}

@Injectable()
export class FeedbackRepository {
  constructor(
    @InjectRepository(FeedbackEntry) private readonly repo: Repository<FeedbackEntry>,
    private readonly versionRepository: SetupVersionRepository,
  ) {}

  async createForUser(
    userId: string,
    versionId: string,
    input: CreateFeedbackInput,
  ): Promise<{ feedback: FeedbackEntry; version: SetupVersion }> {
    const version = await this.versionRepository.findByIdForUser(versionId, userId)
    if (!version) {
      throw new Error('Version not found or access denied')
    }

    const feedback = this.repo.create({
      id: randomUUID(),
      userId,
      setupId: version.setupId,
      versionId,
      text: input.text,
      lapDeltaMs: input.lapDeltaMs ?? null,
    })
    const saved = await this.repo.save(feedback)
    return { feedback: saved, version }
  }

  async findByVersionForUser(versionId: string, userId: string): Promise<FeedbackEntry[]> {
    const version = await this.versionRepository.findByIdForUser(versionId, userId)
    if (!version) {
      return []
    }

    return this.repo.find({
      where: { versionId },
      order: { createdAt: 'DESC' },
    })
  }

  async findBySetupForUser(setupId: string, userId: string): Promise<FeedbackEntry[]> {
    // Verify setup ownership via a version check
    const versions = await this.versionRepository.findBySetupForUser(setupId, userId)
    if (versions.length === 0) {
      return []
    }

    const versionIds = versions.map((v) => v.id)
    return this.repo
      .createQueryBuilder('feedback')
      .where('feedback.versionId IN (:...versionIds)', { versionIds })
      .orderBy('feedback.createdAt', 'DESC')
      .getMany()
  }

  async updateForUser(feedbackId: string, userId: string, input: UpdateFeedbackInput): Promise<FeedbackEntry> {
    const feedback = await this.repo.findOne({
      where: { id: feedbackId },
      relations: ['version', 'version.setup'],
    })
    if (!feedback || feedback.userId !== userId) {
      throw new Error('Feedback not found or access denied')
    }

    Object.assign(feedback, input)
    return this.repo.save(feedback)
  }

  async deleteForUser(feedbackId: string, userId: string): Promise<boolean> {
    const feedback = await this.repo.findOne({
      where: { id: feedbackId },
      relations: ['version', 'version.setup'],
    })
    if (!feedback || feedback.userId !== userId) {
      throw new Error('Feedback not found or access denied')
    }

    const result = await this.repo.delete(feedbackId)
    return result.affected === 1
  }
}