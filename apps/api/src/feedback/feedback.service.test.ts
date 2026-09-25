import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FeedbackRepository } from '../repositories/feedback.repository'
import { SetupVersionRepository } from '../repositories/setup-version.repository'
import { FeedbackService } from './feedback.service'
import type { FeedbackEntry, CarSetupOverlay } from '@pit-wall/api-contracts'

const createMockVersion = (overrides: Partial<{
  id: string
  setupId: string
  versionNo: number
  parentVersionNo: number | null
  sha256: string
  overlay: CarSetupOverlay | null
  fileRef: string
  createdAt: Date
  setup: { userId: string }
}> = {}) => ({
  id: 'version-1',
  setupId: 'setup-1',
  versionNo: 1,
  parentVersionNo: null,
  sha256: 'a'.repeat(64),
  overlay: null,
  fileRef: 'storage/user1/setup1/v1.sto',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  setup: { userId: 'user-1' },
  ...overrides,
})

const createMockFeedbackEntry = (overrides: Partial<{
  id: string
  userId: string
  setupId: string
  versionId: string
  text: string
  lapDeltaMs: number | null
  createdAt: Date
}> = {}) => ({
  id: 'feedback-1',
  userId: 'user-1',
  setupId: 'setup-1',
  versionId: 'version-1',
  text: 'Great setup!',
  lapDeltaMs: -500,
  createdAt: new Date('2024-01-01T10:00:00Z'),
  ...overrides,
})

const createMockFeedbackRepository = () => ({
  createForUser: vi.fn(),
  findByVersionForUser: vi.fn(),
  findBySetupForUser: vi.fn(),
  updateForUser: vi.fn(),
  deleteForUser: vi.fn(),
})

const createMockVersionRepository = () => ({
  findByIdForUser: vi.fn(),
  findBySetupForUser: vi.fn(),
})

describe('FeedbackService', () => {
  let service: FeedbackService
  let feedbackRepository: ReturnType<typeof createMockFeedbackRepository>
  let versionRepository: ReturnType<typeof createMockVersionRepository>

  beforeEach(() => {
    feedbackRepository = createMockFeedbackRepository()
    versionRepository = createMockVersionRepository()
    service = new FeedbackService(
      feedbackRepository as unknown as FeedbackRepository,
      versionRepository as unknown as SetupVersionRepository,
    )
  })

  describe('create', () => {
    it('should create feedback with text and optional lapDeltaMs', async () => {
      const version = createMockVersion({ id: 'v1', versionNo: 1 })
      const feedbackEntry = createMockFeedbackEntry({ id: 'fb1', text: 'Good setup', lapDeltaMs: 100 })

      feedbackRepository.createForUser.mockResolvedValue({ feedback: feedbackEntry, version })
      versionRepository.findByIdForUser.mockResolvedValue(version)

      const result = await service.create('v1', 'user-1', { text: 'Good setup', lapDeltaMs: 100 })

      expect(result).toEqual({
        id: 'fb1',
        versionNo: 1,
        text: 'Good setup',
        lapDeltaMs: 100,
        createdAt: '2024-01-01T10:00:00.000Z',
      })
      expect(feedbackRepository.createForUser).toHaveBeenCalledWith('user-1', 'v1', {
        text: 'Good setup',
        lapDeltaMs: 100,
      })
    })

    it('should create feedback with only text (lapDeltaMs optional)', async () => {
      const version = createMockVersion({ id: 'v1', versionNo: 1 })
      const feedbackEntry = createMockFeedbackEntry({ id: 'fb1', text: 'Good setup', lapDeltaMs: null })

      feedbackRepository.createForUser.mockResolvedValue({ feedback: feedbackEntry, version })
      versionRepository.findByIdForUser.mockResolvedValue(version)

      const result = await service.create('v1', 'user-1', { text: 'Good setup' })

      expect(result).toEqual({
        id: 'fb1',
        versionNo: 1,
        text: 'Good setup',
        lapDeltaMs: undefined,
        createdAt: '2024-01-01T10:00:00.000Z',
      })
      expect(feedbackRepository.createForUser).toHaveBeenCalledWith('user-1', 'v1', {
        text: 'Good setup',
        lapDeltaMs: undefined,
      })
    })

    it('should throw BadRequestException when text is empty', async () => {
      await expect(service.create('v1', 'user-1', { text: '' })).rejects.toThrow('Feedback text is required')
    })

    it('should throw BadRequestException when text is whitespace only', async () => {
      await expect(service.create('v1', 'user-1', { text: '   ' })).rejects.toThrow('Feedback text is required')
    })

    it('should enforce owner-only via repository (throws when version not owned)', async () => {
      feedbackRepository.createForUser.mockRejectedValue(new Error('Version not found or access denied'))

      await expect(service.create('v1', 'user-1', { text: 'Test' })).rejects.toThrow(
        'Version not found or access denied',
      )
    })
  })

  describe('list', () => {
    it('should return feedback entries for version', async () => {
      const version = createMockVersion({ id: 'v1', versionNo: 2 })
      const entries = [
        createMockFeedbackEntry({ id: 'fb1', text: 'First', lapDeltaMs: 100 }),
        createMockFeedbackEntry({ id: 'fb2', text: 'Second', lapDeltaMs: -50 }),
      ]

      feedbackRepository.findByVersionForUser.mockResolvedValue(entries)
      versionRepository.findByIdForUser.mockResolvedValue(version)

      const result = await service.list('v1', 'user-1')

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: 'fb1',
        versionNo: 2,
        text: 'First',
        lapDeltaMs: 100,
        createdAt: '2024-01-01T10:00:00.000Z',
      })
      expect(result[1]).toEqual({
        id: 'fb2',
        versionNo: 2,
        text: 'Second',
        lapDeltaMs: -50,
        createdAt: '2024-01-01T10:00:00.000Z',
      })
    })

    it('should return empty array when no feedback found', async () => {
      feedbackRepository.findByVersionForUser.mockResolvedValue([])
      versionRepository.findByIdForUser.mockResolvedValue(createMockVersion({ id: 'v1' }))

      const result = await service.list('v1', 'user-1')
      expect(result).toEqual([])
    })

    it('should return empty array when version not found', async () => {
      feedbackRepository.findByVersionForUser.mockResolvedValue([])
      versionRepository.findByIdForUser.mockResolvedValue(null)

      const result = await service.list('v1', 'user-1')
      expect(result).toEqual([])
    })

    it('should enforce owner-only (returns empty when version not owned)', async () => {
      feedbackRepository.findByVersionForUser.mockResolvedValue([])
      versionRepository.findByIdForUser.mockResolvedValue(null)

      const result = await service.list('v1', 'user-2')
      expect(result).toEqual([])
    })
  })

  describe('listBySetup', () => {
    it('should return feedback entries for all versions in setup', async () => {
      const version1 = createMockVersion({ id: 'v1', versionNo: 1 })
      const version2 = createMockVersion({ id: 'v2', versionNo: 2 })
      const entries = [
        createMockFeedbackEntry({ id: 'fb1', versionId: 'v1', text: 'On v1', lapDeltaMs: 100 }),
        createMockFeedbackEntry({ id: 'fb2', versionId: 'v2', text: 'On v2', lapDeltaMs: -50 }),
      ]

      feedbackRepository.findBySetupForUser.mockResolvedValue(entries)
      versionRepository.findBySetupForUser.mockResolvedValue([version1, version2])

      const result = await service.listBySetup('setup-1', 'user-1')

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        id: 'fb1',
        versionNo: 1,
        text: 'On v1',
        lapDeltaMs: 100,
        createdAt: '2024-01-01T10:00:00.000Z',
      })
      expect(result[1]).toEqual({
        id: 'fb2',
        versionNo: 2,
        text: 'On v2',
        lapDeltaMs: -50,
        createdAt: '2024-01-01T10:00:00.000Z',
      })
    })

    it('should return empty array when no feedback found', async () => {
      feedbackRepository.findBySetupForUser.mockResolvedValue([])
      versionRepository.findBySetupForUser.mockResolvedValue([])

      const result = await service.listBySetup('setup-1', 'user-1')
      expect(result).toEqual([])
    })

    it('should enforce owner-only (returns empty when setup not owned)', async () => {
      feedbackRepository.findBySetupForUser.mockResolvedValue([])
      versionRepository.findBySetupForUser.mockResolvedValue([])

      const result = await service.listBySetup('setup-1', 'user-2')
      expect(result).toEqual([])
    })
  })

  describe('update', () => {
    it('should update feedback text', async () => {
      const version = createMockVersion({ id: 'v1', versionNo: 1 })
      const updatedEntry = createMockFeedbackEntry({ id: 'fb1', text: 'Updated text', lapDeltaMs: 200 })

      feedbackRepository.updateForUser.mockResolvedValue(updatedEntry)
      versionRepository.findByIdForUser.mockResolvedValue(version)

      const result = await service.update('fb1', 'user-1', { text: 'Updated text' })

      expect(result).toEqual({
        id: 'fb1',
        versionNo: 1,
        text: 'Updated text',
        lapDeltaMs: 200,
        createdAt: '2024-01-01T10:00:00.000Z',
      })
      expect(feedbackRepository.updateForUser).toHaveBeenCalledWith('fb1', 'user-1', { text: 'Updated text' })
    })

    it('should update lapDeltaMs only', async () => {
      const version = createMockVersion({ id: 'v1', versionNo: 1 })
      const updatedEntry = createMockFeedbackEntry({ id: 'fb1', text: 'Original', lapDeltaMs: -100 })

      feedbackRepository.updateForUser.mockResolvedValue(updatedEntry)
      versionRepository.findByIdForUser.mockResolvedValue(version)

      const result = await service.update('fb1', 'user-1', { lapDeltaMs: -100 })

      expect(result.lapDeltaMs).toBe(-100)
      expect(result.text).toBe('Original')
    })

    it('should throw BadRequestException when text is empty', async () => {
      await expect(service.update('fb1', 'user-1', { text: '' })).rejects.toThrow('Feedback text cannot be empty')
    })

    it('should throw BadRequestException when text is whitespace only', async () => {
      await expect(service.update('fb1', 'user-1', { text: '   ' })).rejects.toThrow('Feedback text cannot be empty')
    })

    it('should throw NotFoundException when version not found', async () => {
      feedbackRepository.updateForUser.mockResolvedValue(
        createMockFeedbackEntry({ id: 'fb1', text: 'Test' }),
      )
      versionRepository.findByIdForUser.mockResolvedValue(null)

      await expect(service.update('fb1', 'user-1', { text: 'Test' })).rejects.toThrow('Version not found')
    })

    it('should enforce owner-only via repository (throws when feedback not owned)', async () => {
      feedbackRepository.updateForUser.mockRejectedValue(new Error('Feedback not found or access denied'))

      await expect(service.update('fb1', 'user-2', { text: 'Hacked' })).rejects.toThrow(
        'Feedback not found or access denied',
      )
    })
  })

  describe('delete', () => {
    it('should delete feedback', async () => {
      feedbackRepository.deleteForUser.mockResolvedValue(true)

      await service.delete('fb1', 'user-1')

      expect(feedbackRepository.deleteForUser).toHaveBeenCalledWith('fb1', 'user-1')
    })

    it('should enforce owner-only via repository (throws when feedback not owned)', async () => {
      feedbackRepository.deleteForUser.mockRejectedValue(new Error('Feedback not found or access denied'))

      await expect(service.delete('fb1', 'user-2')).rejects.toThrow('Feedback not found or access denied')
    })
  })
})