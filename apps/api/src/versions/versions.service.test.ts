import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SetupVersionRepository } from '../repositories/setup-version.repository'
import { StorageAdapter } from '../storage/storage-adapter.interface'
import { VersionsService } from './versions.service'
import type { CarSetupOverlay } from '@pit-wall/api-contracts'

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

const createMockStorageAdapter = () => ({
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
})

describe('VersionsService', () => {
  let service: VersionsService
  let versionRepository: { findBySetupForUser: ReturnType<typeof vi.fn>; findByIdForUser: ReturnType<typeof vi.fn> }
  let storageAdapter: ReturnType<typeof createMockStorageAdapter>

  beforeEach(() => {
    versionRepository = {
      findBySetupForUser: vi.fn(),
      findByIdForUser: vi.fn(),
    }
    storageAdapter = createMockStorageAdapter()
    service = new VersionsService(versionRepository as unknown as SetupVersionRepository, storageAdapter as unknown as StorageAdapter)
  })

  describe('listVersions', () => {
    it('should return versions ordered by versionNo descending', async () => {
      const versions = [
        createMockVersion({ versionNo: 1, createdAt: new Date('2024-01-01T00:00:00Z') }),
        createMockVersion({ versionNo: 2, createdAt: new Date('2024-01-02T00:00:00Z') }),
        createMockVersion({ versionNo: 3, createdAt: new Date('2024-01-03T00:00:00Z') }),
      ]
      versionRepository.findBySetupForUser.mockResolvedValue(versions)

      const result = await service.listVersions('setup-1', 'user-1')

      expect(result).toHaveLength(3)
      expect(result[0].versionNo).toBe(3)
      expect(result[1].versionNo).toBe(2)
      expect(result[2].versionNo).toBe(1)
      expect(result[0].hasOverlay).toBe(false)
    })

    it('should return empty array when no versions found', async () => {
      versionRepository.findBySetupForUser.mockResolvedValue([])

      const result = await service.listVersions('setup-1', 'user-1')

      expect(result).toEqual([])
    })

    it('should return hasOverlay: true when overlay exists', async () => {
      const overlay: CarSetupOverlay = {
        categories: {
          suspension: { frontRebound: '5', rearRebound: '4' },
        },
      }
      const versions = [createMockVersion({ versionNo: 1, overlay })]
      versionRepository.findBySetupForUser.mockResolvedValue(versions)

      const result = await service.listVersions('setup-1', 'user-1')

      expect(result[0].hasOverlay).toBe(true)
    })
  })

  describe('diff', () => {
    const baseVersion = createMockVersion({
      id: 'v1',
      versionNo: 1,
      fileRef: 'storage/user1/setup1/v1.sto',
    })

    const newerVersion = createMockVersion({
      id: 'v2',
      versionNo: 2,
      parentVersionNo: 1,
      fileRef: 'storage/user1/setup1/v2.sto',
    })

    it('should return typed diff when both versions have overlays', async () => {
      const oldOverlay: CarSetupOverlay = {
        categories: {
          suspension: { frontRebound: '5', rearRebound: '4' },
          aero: { frontWing: '3' },
        },
      }
      const newOverlay: CarSetupOverlay = {
        categories: {
          suspension: { frontRebound: '6', rearRebound: '4' }, // frontRebound changed
          aero: { frontWing: '3', rearWing: '2' }, // rearWing added
        },
      }

      versionRepository.findByIdForUser
        .mockResolvedValueOnce({ ...baseVersion, overlay: oldOverlay })
        .mockResolvedValueOnce({ ...newerVersion, overlay: newOverlay })

      const result = await service.diff('v1', 'v2', 'user-1')

      expect(result).toEqual({
        changedFields: [
          { field: 'suspension.frontRebound', oldValue: '5', newValue: '6' },
          { field: 'aero.rearWing', oldValue: '', newValue: '2' },
        ],
      })
    })

    it('should return typed diff with removed fields', async () => {
      const oldOverlay: CarSetupOverlay = {
        categories: {
          suspension: { frontRebound: '5', rearRebound: '4' },
        },
      }
      const newOverlay: CarSetupOverlay = {
        categories: {
          suspension: { frontRebound: '5' }, // rearRebound removed
        },
      }

      versionRepository.findByIdForUser
        .mockResolvedValueOnce({ ...baseVersion, overlay: oldOverlay })
        .mockResolvedValueOnce({ ...newerVersion, overlay: newOverlay })

      const result = await service.diff('v1', 'v2', 'user-1')

      expect(result).toEqual({
        changedFields: [
          { field: 'suspension.rearRebound', oldValue: '4', newValue: '' },
        ],
      })
    })

    it('should return byte diff when from version has no overlay', async () => {
      versionRepository.findByIdForUser
        .mockResolvedValueOnce({ ...baseVersion, overlay: null })
        .mockResolvedValueOnce({ ...newerVersion, overlay: null })

      storageAdapter.get
        .mockResolvedValueOnce(Buffer.from('hello world'))
        .mockResolvedValueOnce(Buffer.from('hello there'))

      const result = await service.diff('v1', 'v2', 'user-1')

      expect(result).toHaveProperty('regions')
      expect(Array.isArray(result.regions)).toBe(true)
    })

    it('should return byte diff when to version has no overlay', async () => {
      const oldOverlay: CarSetupOverlay = {
        categories: { suspension: { frontRebound: '5' } },
      }

      versionRepository.findByIdForUser
        .mockResolvedValueOnce({ ...baseVersion, overlay: oldOverlay })
        .mockResolvedValueOnce({ ...newerVersion, overlay: null })

      storageAdapter.get
        .mockResolvedValueOnce(Buffer.from('hello world'))
        .mockResolvedValueOnce(Buffer.from('hello there'))

      const result = await service.diff('v1', 'v2', 'user-1')

      expect(result).toHaveProperty('regions')
    })

    it('should throw NotFoundException when from version not found', async () => {
      versionRepository.findByIdForUser.mockResolvedValueOnce(null)

      await expect(service.diff('v1', 'v2', 'user-1')).rejects.toThrow('not found or access denied')
    })

    it('should throw NotFoundException when to version not found', async () => {
      versionRepository.findByIdForUser
        .mockResolvedValueOnce(baseVersion)
        .mockResolvedValueOnce(null)

      await expect(service.diff('v1', 'v2', 'user-1')).rejects.toThrow('not found or access denied')
    })

    it('should throw BadRequestException when versions belong to different setups', async () => {
      versionRepository.findByIdForUser
        .mockResolvedValueOnce({ ...baseVersion, setupId: 'setup-1' })
        .mockResolvedValueOnce({ ...newerVersion, setupId: 'setup-2' })

      await expect(service.diff('v1', 'v2', 'user-1')).rejects.toThrow('same setup')
    })

    it('should throw BadRequestException when fromVersion >= toVersion', async () => {
      versionRepository.findByIdForUser
        .mockResolvedValueOnce({ ...baseVersion, versionNo: 2 })
        .mockResolvedValueOnce({ ...newerVersion, versionNo: 1 })

      await expect(service.diff('v1', 'v2', 'user-1')).rejects.toThrow('fromVersion must be less than toVersion')
    })
  })

  describe('typedDiff (private method via diff)', () => {
    it('should handle empty overlays', async () => {
      versionRepository.findByIdForUser
        .mockResolvedValueOnce({ ...createMockVersion({ id: 'v1', versionNo: 1, overlay: { categories: {} } }) })
        .mockResolvedValueOnce({ ...createMockVersion({ id: 'v2', versionNo: 2, overlay: { categories: {} } }) })

      const result = await service.diff('v1', 'v2', 'user-1')

      expect(result).toEqual({ changedFields: [] })
    })

    it('should handle nested category changes', async () => {
      const oldOverlay: CarSetupOverlay = {
        categories: {
          tyres: { pressureFL: '2.2', pressureFR: '2.2' },
        },
      }
      const newOverlay: CarSetupOverlay = {
        categories: {
          tyres: { pressureFL: '2.3', pressureFR: '2.2', pressureRL: '2.1' },
        },
      }

      versionRepository.findByIdForUser
        .mockResolvedValueOnce({ ...createMockVersion({ id: 'v1', versionNo: 1, overlay: oldOverlay }) })
        .mockResolvedValueOnce({ ...createMockVersion({ id: 'v2', versionNo: 2, overlay: newOverlay }) })

      const result = await service.diff('v1', 'v2', 'user-1')

      expect(result.changedFields).toHaveLength(2)
      const fields = result.changedFields.map((f) => f.field).sort()
      expect(fields).toEqual(['tyres.pressureFL', 'tyres.pressureRL'])
    })
  })

  describe('byteDiff (private method via diff)', () => {
    it('should detect single byte change', async () => {
      versionRepository.findByIdForUser
        .mockResolvedValueOnce({ ...createMockVersion({ id: 'v1', versionNo: 1, overlay: null, fileRef: 'f1' }) })
        .mockResolvedValueOnce({ ...createMockVersion({ id: 'v2', versionNo: 2, overlay: null, fileRef: 'f2' }) })

      storageAdapter.get
        .mockResolvedValueOnce(Buffer.from('abc'))
        .mockResolvedValueOnce(Buffer.from('axc'))

      const result = await service.diff('v1', 'v2', 'user-1')

      expect(result.regions).toHaveLength(1)
      expect(result.regions[0]).toEqual({
        offset: 1,
        length: 1,
        oldBytes: '62', // 'b'
        newBytes: '78', // 'x'
      })
    })

    it('should group consecutive differences', async () => {
      versionRepository.findByIdForUser
        .mockResolvedValueOnce({ ...createMockVersion({ id: 'v1', versionNo: 1, overlay: null, fileRef: 'f1' }) })
        .mockResolvedValueOnce({ ...createMockVersion({ id: 'v2', versionNo: 2, overlay: null, fileRef: 'f2' }) })

      storageAdapter.get
        .mockResolvedValueOnce(Buffer.from('hello world'))
        .mockResolvedValueOnce(Buffer.from('hello there'))

      const result = await service.diff('v1', 'v2', 'user-1')

      // ' world' vs ' there' -> bytes 6-10 differ (5 bytes)
      expect(result.regions).toHaveLength(1)
      expect(result.regions[0].offset).toBe(6)
      expect(result.regions[0].length).toBe(5)
    })

    it('should handle different length buffers', async () => {
      versionRepository.findByIdForUser
        .mockResolvedValueOnce({ ...createMockVersion({ id: 'v1', versionNo: 1, overlay: null, fileRef: 'f1' }) })
        .mockResolvedValueOnce({ ...createMockVersion({ id: 'v2', versionNo: 2, overlay: null, fileRef: 'f2' }) })

      storageAdapter.get
        .mockResolvedValueOnce(Buffer.from('short'))
        .mockResolvedValueOnce(Buffer.from('much longer string'))

      const result = await service.diff('v1', 'v2', 'user-1')

      expect(result.regions.length).toBeGreaterThan(0)
      // Should detect differences through the longer string
    })

    it('should return empty regions for identical buffers', async () => {
      versionRepository.findByIdForUser
        .mockResolvedValueOnce({ ...createMockVersion({ id: 'v1', versionNo: 1, overlay: null, fileRef: 'f1' }) })
        .mockResolvedValueOnce({ ...createMockVersion({ id: 'v2', versionNo: 2, overlay: null, fileRef: 'f2' }) })

      storageAdapter.get
        .mockResolvedValueOnce(Buffer.from('identical'))
        .mockResolvedValueOnce(Buffer.from('identical'))

      const result = await service.diff('v1', 'v2', 'user-1')

      expect(result.regions).toEqual([])
    })
  })
})