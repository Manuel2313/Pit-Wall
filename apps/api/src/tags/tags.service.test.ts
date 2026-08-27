import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TagRepository } from '../repositories/tag.repository'
import { SetupRepository } from '../repositories/setup.repository'
import { TagsService } from './tags.service'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import type { Tag } from '../database/entities/tag.entity'

const createMockTag = (overrides: Partial<{
  id: string
  name: string
  userId: string
  createdAt: Date
}> = {}) => ({
  id: 'tag-1',
  name: 'test-tag',
  userId: 'user-1',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
})

const createMockSetup = (overrides: Partial<{
  id: string
  userId: string
  carId: string
  trackId: string
  condition: string
}> = {}) => ({
  id: 'setup-1',
  userId: 'user-1',
  carId: 'car-1',
  trackId: 'track-1',
  condition: 'dry',
  ...overrides,
})

const createMockTagRepository = () => ({
  createForUser: vi.fn(),
  findByUser: vi.fn(),
  findByIdForUser: vi.fn(),
  findByNameForUser: vi.fn(),
  findOrCreateForUser: vi.fn(),
  addTagToSetup: vi.fn(),
  removeTagFromSetup: vi.fn(),
  getTagsForSetup: vi.fn(),
})

const createMockSetupRepository = () => ({
  findByIdForUser: vi.fn(),
})

describe('TagsService', () => {
  let service: TagsService
  let tagRepository: ReturnType<typeof createMockTagRepository>
  let setupRepository: ReturnType<typeof createMockSetupRepository>

  beforeEach(() => {
    tagRepository = createMockTagRepository()
    setupRepository = createMockSetupRepository()
    service = new TagsService(tagRepository as unknown as TagRepository)
  })

  describe('updateTags', () => {
    it('should upsert tags and link to setup', async () => {
      const tag1 = createMockTag({ id: 'tag-1', name: 'qualifying' })
      const tag2 = createMockTag({ id: 'tag-2', name: 'rain' })
      const setup = createMockSetup({ id: 'setup-1' })
      const linkedTags = [tag1, tag2]

      tagRepository.findOrCreateForUser
        .mockResolvedValueOnce(tag1)
        .mockResolvedValueOnce(tag2)
      tagRepository.addTagToSetup.mockResolvedValue({} as any)
      tagRepository.getTagsForSetup.mockResolvedValue(linkedTags)

      const result = await service.updateTags('setup-1', 'user-1', ['qualifying', 'rain'])

      expect(result).toEqual({ tags: ['qualifying', 'rain'] })
      expect(tagRepository.findOrCreateForUser).toHaveBeenCalledTimes(2)
      expect(tagRepository.findOrCreateForUser).toHaveBeenNthCalledWith(1, 'user-1', 'qualifying')
      expect(tagRepository.findOrCreateForUser).toHaveBeenNthCalledWith(2, 'user-1', 'rain')
      expect(tagRepository.addTagToSetup).toHaveBeenCalledTimes(2)
    })

    it('should deduplicate tag names', async () => {
      const tag1 = createMockTag({ id: 'tag-1', name: 'qualifying' })
      const linkedTags = [tag1]

      tagRepository.findOrCreateForUser.mockResolvedValue(tag1)
      tagRepository.addTagToSetup.mockResolvedValue({} as any)
      tagRepository.getTagsForSetup.mockResolvedValue(linkedTags)

      const result = await service.updateTags('setup-1', 'user-1', ['qualifying', 'qualifying', 'rain'])

      expect(result).toEqual({ tags: ['qualifying'] })
      expect(tagRepository.findOrCreateForUser).toHaveBeenCalledTimes(2) // qualifying + rain
    })

    it('should skip empty tag names', async () => {
      const tag1 = createMockTag({ id: 'tag-1', name: 'valid' })
      const linkedTags = [tag1]

      tagRepository.findOrCreateForUser.mockResolvedValue(tag1)
      tagRepository.addTagToSetup.mockResolvedValue({} as any)
      tagRepository.getTagsForSetup.mockResolvedValue(linkedTags)

      const result = await service.updateTags('setup-1', 'user-1', ['valid', '', '  '])

      expect(result).toEqual({ tags: ['valid'] })
      expect(tagRepository.findOrCreateForUser).toHaveBeenCalledTimes(1)
    })

    it('should throw BadRequestException when tags is not an array', async () => {
      await expect(service.updateTags('setup-1', 'user-1', 'not-an-array' as any)).rejects.toThrow(
        'Tags must be an array',
      )
    })

    it('should return empty array when no tags', async () => {
      tagRepository.getTagsForSetup.mockResolvedValue([])

      const result = await service.updateTags('setup-1', 'user-1', [])

      expect(result).toEqual({ tags: [] })
      expect(tagRepository.findOrCreateForUser).not.toHaveBeenCalled()
    })

    it('should enforce owner-only via repository (throws when setup not owned)', async () => {
      const tag = createMockTag({ id: 'tag-1', name: 'test', userId: 'user-2' })
      tagRepository.findOrCreateForUser.mockResolvedValue(tag)
      tagRepository.addTagToSetup.mockRejectedValue(new Error('Setup not found or access denied'))

      await expect(service.updateTags('setup-1', 'user-2', ['test'])).rejects.toThrow(
        'Setup not found or access denied',
      )
    })
  })

  describe('getTags', () => {
    it('should return tags for setup', async () => {
      const tag1 = createMockTag({ id: 'tag-1', name: 'qualifying' })
      const tag2 = createMockTag({ id: 'tag-2', name: 'rain' })

      tagRepository.getTagsForSetup.mockResolvedValue([tag1, tag2])

      const result = await service.getTags('setup-1', 'user-1')

      expect(result).toEqual({ tags: ['qualifying', 'rain'] })
    })

    it('should return empty array when no tags', async () => {
      tagRepository.getTagsForSetup.mockResolvedValue([])

      const result = await service.getTags('setup-1', 'user-1')

      expect(result).toEqual({ tags: [] })
    })

    it('should enforce owner-only (returns empty when setup not owned)', async () => {
      tagRepository.getTagsForSetup.mockResolvedValue([])

      const result = await service.getTags('setup-1', 'user-2')

      expect(result).toEqual({ tags: [] })
    })
  })

  describe('deleteTag', () => {
    it('should delete tag from setup and return remaining tags', async () => {
      const tag1 = createMockTag({ id: 'tag-1', name: 'qualifying' })
      const tag2 = createMockTag({ id: 'tag-2', name: 'rain' })
      const remainingTags = [tag2]

      tagRepository.findByNameForUser.mockResolvedValue(tag1)
      tagRepository.removeTagFromSetup.mockResolvedValue(true)
      tagRepository.getTagsForSetup.mockResolvedValue(remainingTags)

      const result = await service.deleteTag('setup-1', 'user-1', 'qualifying')

      expect(result).toEqual({ tags: ['rain'] })
      expect(tagRepository.findByNameForUser).toHaveBeenCalledWith('user-1', 'qualifying')
      expect(tagRepository.removeTagFromSetup).toHaveBeenCalledWith('setup-1', 'user-1', 'tag-1')
    })

    it('should throw NotFoundException when tag not found for user', async () => {
      tagRepository.findByNameForUser.mockResolvedValue(null)

      await expect(service.deleteTag('setup-1', 'user-1', 'nonexistent')).rejects.toThrow(
        'Tag not found',
      )
    })

    it('should throw NotFoundException when tag not linked to setup', async () => {
      const tag1 = createMockTag({ id: 'tag-1', name: 'qualifying' })

      tagRepository.findByNameForUser.mockResolvedValue(tag1)
      tagRepository.removeTagFromSetup.mockResolvedValue(false)

      await expect(service.deleteTag('setup-1', 'user-1', 'qualifying')).rejects.toThrow(
        'Tag not linked to this setup',
      )
    })

    it('should throw BadRequestException when tag name is empty', async () => {
      await expect(service.deleteTag('setup-1', 'user-1', '')).rejects.toThrow('Tag name is required')
    })

    it('should throw BadRequestException when tag name is whitespace only', async () => {
      await expect(service.deleteTag('setup-1', 'user-1', '   ')).rejects.toThrow('Tag name is required')
    })

    it('A≠B: should not allow user B to delete tag from user A setup', async () => {
      tagRepository.findByNameForUser.mockResolvedValue(null)

      await expect(service.deleteTag('setup-1', 'user-B', 'test')).rejects.toThrow('Tag not found')
    })
  })
})