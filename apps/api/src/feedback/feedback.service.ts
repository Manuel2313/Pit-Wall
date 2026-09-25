import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { FeedbackRepository, CreateFeedbackInput, UpdateFeedbackInput } from '../repositories/feedback.repository'
import { SetupVersionRepository } from '../repositories/setup-version.repository'
import type { FeedbackEntry } from '@pit-wall/api-contracts'

@Injectable()
export class FeedbackService {
  constructor(
    private readonly feedbackRepository: FeedbackRepository,
    private readonly versionRepository: SetupVersionRepository,
  ) {}

  async create(versionId: string, userId: string, input: CreateFeedbackInput): Promise<FeedbackEntry> {
    if (!input.text || input.text.trim().length === 0) {
      throw new BadRequestException('Feedback text is required')
    }

    const { feedback, version } = await this.feedbackRepository.createForUser(userId, versionId, input)

    return {
      id: feedback.id,
      versionNo: version.versionNo,
      text: feedback.text,
      lapDeltaMs: feedback.lapDeltaMs ?? undefined,
      createdAt: feedback.createdAt.toISOString(),
    }
  }

  async list(versionId: string, userId: string): Promise<FeedbackEntry[]> {
    const feedbackEntries = await this.feedbackRepository.findByVersionForUser(versionId, userId)

    if (feedbackEntries.length === 0) {
      return []
    }

    const version = await this.versionRepository.findByIdForUser(versionId, userId)
    if (!version) {
      return []
    }

    return feedbackEntries.map((entry) => ({
      id: entry.id,
      versionNo: version.versionNo,
      text: entry.text,
      lapDeltaMs: entry.lapDeltaMs ?? undefined,
      createdAt: entry.createdAt.toISOString(),
    }))
  }

  async listBySetup(setupId: string, userId: string): Promise<FeedbackEntry[]> {
    const feedbackEntries = await this.feedbackRepository.findBySetupForUser(setupId, userId)

    if (feedbackEntries.length === 0) {
      return []
    }

    const versions = await this.versionRepository.findBySetupForUser(setupId, userId)
    const versionMap = new Map(versions.map((v) => [v.id, v.versionNo]))

    return feedbackEntries.map((entry) => ({
      id: entry.id,
      versionNo: versionMap.get(entry.versionId) ?? 0,
      text: entry.text,
      lapDeltaMs: entry.lapDeltaMs ?? undefined,
      createdAt: entry.createdAt.toISOString(),
    }))
  }

  async update(feedbackId: string, userId: string, input: UpdateFeedbackInput): Promise<FeedbackEntry> {
    if (input.text !== undefined && input.text.trim().length === 0) {
      throw new BadRequestException('Feedback text cannot be empty')
    }

    const feedback = await this.feedbackRepository.updateForUser(feedbackId, userId, input)

    const version = await this.versionRepository.findByIdForUser(feedback.versionId, userId)
    if (!version) {
      throw new NotFoundException('Version not found')
    }

    return {
      id: feedback.id,
      versionNo: version.versionNo,
      text: feedback.text,
      lapDeltaMs: feedback.lapDeltaMs ?? undefined,
      createdAt: feedback.createdAt.toISOString(),
    }
  }

  async delete(feedbackId: string, userId: string): Promise<void> {
    await this.feedbackRepository.deleteForUser(feedbackId, userId)
  }
}