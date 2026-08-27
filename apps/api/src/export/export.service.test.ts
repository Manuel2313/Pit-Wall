import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SetupVersionRepository } from '../repositories/setup-version.repository'
import { StorageAdapter } from '../storage/storage-adapter.interface'
import { ExportService } from './export.service'
import { FileNotFound } from '../storage/file-not-found.error'
import { createHash } from 'node:crypto'
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

describe('ExportService', () => {
  let service: ExportService
  let versionRepository: { findByIdForUser: ReturnType<typeof vi.fn> }
  let storageAdapter: ReturnType<typeof createMockStorageAdapter>

  beforeEach(() => {
    versionRepository = {
      findByIdForUser: vi.fn(),
    }
    storageAdapter = createMockStorageAdapter()
    service = new ExportService(
      versionRepository as unknown as SetupVersionRepository,
      storageAdapter as unknown as StorageAdapter,
    )
  })

  describe('exportFile', () => {
    it('should return file buffer, sha256, and filename for imported version', async () => {
      const version = createMockVersion({
        id: 'v1',
        versionNo: 1,
        fileRef: 'storage/user1/setup1/v1.sto',
      })
      const fileContent = Buffer.from('fake .sto file content')
      const expectedSha256 = createHash('sha256').update(fileContent).digest('hex')

      versionRepository.findByIdForUser.mockResolvedValue(version)
      storageAdapter.get.mockResolvedValue(fileContent)

      const result = await service.exportFile('v1', 'user-1')

      expect(result.buffer).toEqual(fileContent)
      expect(result.sha256).toBe(expectedSha256)
      expect(result.filename).toBe('setup_v1.sto')
      expect(storageAdapter.get).toHaveBeenCalledWith('storage/user1/setup1/v1.sto')
    })

    it('should return file for version 2 with correct filename', async () => {
      const version = createMockVersion({
        id: 'v2',
        versionNo: 2,
        fileRef: 'storage/user1/setup1/v2.sto',
      })
      const fileContent = Buffer.from('version 2 content')
      const expectedSha256 = createHash('sha256').update(fileContent).digest('hex')

      versionRepository.findByIdForUser.mockResolvedValue(version)
      storageAdapter.get.mockResolvedValue(fileContent)

      const result = await service.exportFile('v2', 'user-1')

      expect(result.buffer).toEqual(fileContent)
      expect(result.sha256).toBe(expectedSha256)
      expect(result.filename).toBe('setup_v2.sto')
    })

    it('should throw NotFoundException when version not found', async () => {
      versionRepository.findByIdForUser.mockResolvedValue(null)

      await expect(service.exportFile('v1', 'user-1')).rejects.toThrow('Version not found or access denied')
    })

    it('should throw NotFoundException when version belongs to another user', async () => {
      versionRepository.findByIdForUser.mockResolvedValue(null)

      await expect(service.exportFile('v1', 'user-2')).rejects.toThrow('Version not found or access denied')
    })

    it('should throw BadRequestException for manual-only version (no fileRef)', async () => {
      const version = createMockVersion({
        id: 'v1',
        versionNo: 1,
        fileRef: '',
      })

      versionRepository.findByIdForUser.mockResolvedValue(version)

      await expect(service.exportFile('v1', 'user-1')).rejects.toThrow('Manual-only version has no export')
    })

    it('should throw BadRequestException for manual-only version (null fileRef)', async () => {
      const version = createMockVersion({
        id: 'v1',
        versionNo: 1,
        fileRef: null as any,
      })

      versionRepository.findByIdForUser.mockResolvedValue(version)

      await expect(service.exportFile('v1', 'user-1')).rejects.toThrow('Manual-only version has no export')
    })

    it('should throw NotFoundException when file not found in storage', async () => {
      const version = createMockVersion({
        id: 'v1',
        versionNo: 1,
        fileRef: 'storage/user1/setup1/v1.sto',
      })

      versionRepository.findByIdForUser.mockResolvedValue(version)
      storageAdapter.get.mockRejectedValue(new FileNotFound('storage/user1/setup1/v1.sto'))

      await expect(service.exportFile('v1', 'user-1')).rejects.toThrow('File not found in storage')
    })

    it('should return byte-identical file (SHA matches version sha256 for imported)', async () => {
      const fileContent = Buffer.from('exact file content from import')
      const expectedSha256 = createHash('sha256').update(fileContent).digest('hex')

      const version = createMockVersion({
        id: 'v1',
        versionNo: 1,
        sha256: expectedSha256,
        fileRef: 'storage/user1/setup1/v1.sto',
      })

      versionRepository.findByIdForUser.mockResolvedValue(version)
      storageAdapter.get.mockResolvedValue(fileContent)

      const result = await service.exportFile('v1', 'user-1')

      expect(result.sha256).toBe(version.sha256)
      expect(result.buffer).toEqual(fileContent)
    })

    it('A≠B: should not allow user B to export user A version', async () => {
      versionRepository.findByIdForUser.mockResolvedValue(null)

      await expect(service.exportFile('v1', 'user-B')).rejects.toThrow('Version not found or access denied')
    })
  })
})