import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { DataSource, Repository } from 'typeorm'
import { newDb } from 'pg-mem'
import { Car } from '../database/entities/car.entity'
import { Track } from '../database/entities/track.entity'
import { User } from '../database/entities/user.entity'
import { Session } from '../database/entities/session.entity'
import { ResetToken } from '../database/entities/reset-token.entity'
import { Setup } from '../database/entities/setup.entity'
import { SetupVersion } from '../database/entities/setup-version.entity'
import { FeedbackEntry } from '../database/entities/feedback-entry.entity'
import { Tag } from '../database/entities/tag.entity'
import { SetupTag } from '../database/entities/setup-tag.entity'
import { ImportConfirmService } from './import-confirm.service'
import { SetupRepository } from '../repositories/setup.repository'
import { SetupVersionRepository } from '../repositories/setup-version.repository'
import { FsStorageAdapter } from '../storage/fs-storage.adapter'
import { createHash } from 'node:crypto'

let genRandomUuidCounter = 0
const genRandomUuid = () => {
  genRandomUuidCounter++
  const hex = genRandomUuidCounter.toString(16).padStart(32, '0')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20)}`
}

let uuidGenerateV4Counter = 0
const uuidGenerateV4 = () => {
  uuidGenerateV4Counter++
  const hex = uuidGenerateV4Counter.toString(16).padStart(32, '0')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20)}`
}

function resetCounters() {
  genRandomUuidCounter = 0
  uuidGenerateV4Counter = 0
}

describe.sequential('ImportConfirmService', () => {
  let db: DataSource
  let userRepository: Repository<User>
  let carRepository: Repository<Car>
  let trackRepository: Repository<Track>
  let setupRepository: SetupRepository
  let versionRepository: SetupVersionRepository
  let confirmService: ImportConfirmService
  let storageAdapter: FsStorageAdapter

  let testUser: User
  let testUserA: User
  let testUserB: User

  beforeAll(async () => {
    resetCounters()

    const pgMem = newDb({ autoCreateForeignKeyIndices: true })
    pgMem.public.registerFunction({
      name: 'gen_random_uuid',
      implementation: genRandomUuid,
    })
    pgMem.public.registerFunction({
      name: 'uuid_generate_v4',
      implementation: uuidGenerateV4,
    })
    pgMem.public.registerFunction({
      name: 'version',
      implementation: () => 'PostgreSQL 16.0 (pg-mem)',
    })
    pgMem.public.registerFunction({
      name: 'current_database',
      implementation: () => 'test_db',
    })
    pgMem.public.registerFunction({
      name: 'current_user',
      implementation: () => 'test_user',
    })
    pgMem.public.registerFunction({
      name: 'current_setting',
      implementation: (setting: string) => {
        if (setting === 'server_version_num') return '160000'
        return ''
      },
    })

    db = await pgMem.adapters.createTypeormDataSource({
      type: 'postgres',
      entities: [
        User,
        Session,
        ResetToken,
        Car,
        Track,
        Setup,
        SetupVersion,
        FeedbackEntry,
        Tag,
        SetupTag,
      ],
      synchronize: true,
    })

    await db.initialize()

    userRepository = db.getRepository(User)
    carRepository = db.getRepository(Car)
    trackRepository = db.getRepository(Track)

    // Create test users with explicit UUIDs
    testUser = await userRepository.save({
      id: '11111111-1111-1111-1111-111111111111',
      email: 'test@example.com',
      passwordHash: 'hash',
    })
    testUserA = await userRepository.save({
      id: '22222222-2222-2222-2222-222222222222',
      email: 'usera@example.com',
      passwordHash: 'hash',
    })
    testUserB = await userRepository.save({
      id: '33333333-3333-3333-3333-333333333333',
      email: 'userb@example.com',
      passwordHash: 'hash',
    })

    // Seed catalog cars
    await carRepository.save([
      { id: '11111111-1111-1111-1111-111111111111', name: 'Ferrari 296 GT3', category: 'GT3' },
      { id: '22222222-2222-2222-2222-222222222222', name: 'Mustang GT3', category: 'GT3' },
      { id: '33333333-3333-3333-3333-333333333333', name: 'Mercedes-AMG GT3', category: 'GT3' },
      { id: '44444444-4444-4444-4444-444444444444', name: 'Porsche 911 GT3 Cup 992', category: 'Porsche Cup' },
    ])

    // Seed catalog tracks
    await trackRepository.save([
      { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Spa-Francorchamps', layout: 'Grand Prix' },
      { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name: 'Monza', layout: 'Grand Prix' },
    ])

    // Create a mock storage adapter using a temp directory
    const tmpDir = '/tmp/pit-wall-test-storage-confirm'
    storageAdapter = new FsStorageAdapter(tmpDir)

    setupRepository = new SetupRepository(db.getRepository(Setup))
    versionRepository = new SetupVersionRepository(db.getRepository(SetupVersion), setupRepository)

    confirmService = new ImportConfirmService(
      storageAdapter,
      setupRepository,
      versionRepository,
      carRepository,
      trackRepository,
    )
  })

  afterAll(async () => {
    await db.destroy()
  })

  beforeEach(async () => {
    resetCounters()

    // Clean up user-specific data in correct order (respecting FK constraints)
    await db.createQueryBuilder().delete().from(SetupTag).execute()
    await db.createQueryBuilder().delete().from(Tag).execute()
    await db.createQueryBuilder().delete().from(FeedbackEntry).execute()
    await db.createQueryBuilder().delete().from(SetupVersion).execute()
    await db.createQueryBuilder().delete().from(Setup).execute()
  })

  // Helper to create a valid .sto file buffer
  function createValidStoBuffer(notesText: string): Buffer {
    const utf16Notes = Buffer.alloc(notesText.length * 2 + 2)
    for (let i = 0; i < notesText.length; i++) {
      const code = notesText.charCodeAt(i)
      utf16Notes[i * 2] = code & 0xff
      utf16Notes[i * 2 + 1] = (code >>> 8) & 0xff
    }

    const payloadSize = 8 + utf16Notes.length
    const payload = Buffer.alloc(payloadSize)
    utf16Notes.copy(payload, 8)

    const fs = payloadSize
    const prefix = Buffer.alloc(8)
    prefix.writeUInt32LE(0x0003, 0) // Magic = 3 (little-endian)
    prefix.writeUInt32LE(fs, 4) // File size

    const trailer = Buffer.alloc(8) // 8 zero bytes terminator

    return Buffer.concat([prefix, payload, trailer])
  }

  function createImportConfirmRequest(overrides: Partial<{
    car: string
    track: string
    category: string
    notes: string
    htmlOverlay: Record<string, Record<string, string>>
    manualOverlay: Record<string, Record<string, string>>
  }> = {}) {
    const notes = overrides.notes ?? 'Ferrari 296 GT3 setup for Spa-Francorchamps'
    const car = overrides.car ?? 'Ferrari 296 GT3'
    const track = overrides.track ?? 'Spa-Francorchamps'
    const category = overrides.category ?? 'GT3'

    const fileBuffer = createValidStoBuffer(notes)
    const sha256 = createHash('sha256').update(fileBuffer).digest('hex')

    return {
      metadata: {
        car,
        track,
        category,
        notes,
      },
      sha256,
      htmlOverlay: overrides.htmlOverlay,
      manualOverlay: overrides.manualOverlay,
    }
  }

  describe('confirm', () => {
    it('should create Setup + Version 1 + store .sto file', async () => {
      const userId = testUser.id
      const request = createImportConfirmRequest()
      const fileBuffer = createValidStoBuffer(request.metadata.notes)

      const result = await confirmService.confirm(userId, request, fileBuffer)

      expect(result.setupId).toBeDefined()
      expect(result.versionNo).toBe(1)
      expect(result.sha256).toBe(request.sha256)

      // Verify setup was created
      const setup = await setupRepository.findByIdForUser(result.setupId, userId)
      expect(setup).not.toBeNull()
      expect(setup!.carId).toBe('11111111-1111-1111-1111-111111111111') // Ferrari 296 GT3
      expect(setup!.trackId).toBe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') // Spa-Francorchamps
      expect(setup!.condition).toBe('GT3')
      expect(setup!.userId).toBe(userId)

      // Verify version was created
      const versions = await versionRepository.findBySetupForUser(result.setupId, userId)
      expect(versions).toHaveLength(1)
      expect(versions[0].versionNo).toBe(1)
      expect(versions[0].parentVersionNo).toBeNull()
      expect(versions[0].sha256).toBe(request.sha256)
      expect(versions[0].fileRef).toMatch(/^storage\/11111111-1111-1111-1111-111111111111\/[^/]+\/[^/]+\.sto$/)
      expect(versions[0].overlay).toBeNull()

      // Verify file was stored
      const storedBuffer = await storageAdapter.get(versions[0].fileRef)
      expect(storedBuffer).toEqual(fileBuffer)
    })

    it('should store file with correct storage key format: storage/{userId}/{setupId}/{versionId}.sto', async () => {
      const userId = testUser.id
      const request = createImportConfirmRequest()
      const fileBuffer = createValidStoBuffer(request.metadata.notes)

      const result = await confirmService.confirm(userId, request, fileBuffer)

      const versions = await versionRepository.findBySetupForUser(result.setupId, userId)
      const fileRef = versions[0].fileRef

      expect(fileRef).toMatch(/^storage\/11111111-1111-1111-1111-111111111111\/[^/]+\/[^/]+\.sto$/)
      const parts = fileRef.split('/')
      expect(parts[0]).toBe('storage')
      expect(parts[1]).toBe('11111111-1111-1111-1111-111111111111')
      expect(parts[2]).toBe(result.setupId)
      expect(parts[3]).toMatch(/^[0-9a-f-]{36}\.sto$/) // UUID + .sto
    })

    it('should include overlay from htmlOverlay when provided', async () => {
      const userId = testUser.id
      const overlay = {
        categories: {
          'LEFT FRONT': { 'Starting pressure': '27.5 psi' },
        },
      }
      const request = createImportConfirmRequest({ htmlOverlay: overlay })
      const fileBuffer = createValidStoBuffer(request.metadata.notes)

      const result = await confirmService.confirm(userId, request, fileBuffer)

      const versions = await versionRepository.findBySetupForUser(result.setupId, userId)
      expect(versions[0].overlay).toEqual(overlay)
    })

    it('should prefer htmlOverlay over manualOverlay', async () => {
      const userId = testUser.id
      const htmlOverlay = {
        categories: {
          'LEFT FRONT': { 'Starting pressure': '27.5 psi' },
        },
      }
      const manualOverlay = {
        categories: {
          'RIGHT FRONT': { 'Starting pressure': '28.0 psi' },
        },
      }
      const request = createImportConfirmRequest({ htmlOverlay, manualOverlay })
      const fileBuffer = createValidStoBuffer(request.metadata.notes)

      const result = await confirmService.confirm(userId, request, fileBuffer)

      const versions = await versionRepository.findBySetupForUser(result.setupId, userId)
      expect(versions[0].overlay).toEqual(htmlOverlay)
    })

    it('should use manualOverlay when htmlOverlay not provided', async () => {
      const userId = testUser.id
      const manualOverlay = {
        categories: {
          'RIGHT FRONT': { 'Starting pressure': '28.0 psi' },
        },
      }
      const request = createImportConfirmRequest({ manualOverlay })
      const fileBuffer = createValidStoBuffer(request.metadata.notes)

      const result = await confirmService.confirm(userId, request, fileBuffer)

      const versions = await versionRepository.findBySetupForUser(result.setupId, userId)
      expect(versions[0].overlay).toEqual(manualOverlay)
    })

    it('should throw BadRequestException when SHA-256 mismatch', async () => {
      const userId = testUser.id
      const request = createImportConfirmRequest()
      const wrongBuffer = Buffer.from('different content')

      await expect(confirmService.confirm(userId, request, wrongBuffer)).rejects.toThrow(
        'SHA-256 mismatch: uploaded file does not match preview',
      )
    })

    it('should throw NotFoundException when car not in catalog', async () => {
      const userId = testUser.id
      const request = createImportConfirmRequest({ car: 'Non-existent Car' })
      const fileBuffer = createValidStoBuffer(request.metadata.notes)

      await expect(confirmService.confirm(userId, request, fileBuffer)).rejects.toThrow(
        'Car not found in catalog: Non-existent Car',
      )
    })

    it('should throw NotFoundException when track not in catalog', async () => {
      const userId = testUser.id
      const request = createImportConfirmRequest({ track: 'Non-existent Track' })
      const fileBuffer = createValidStoBuffer(request.metadata.notes)

      await expect(confirmService.confirm(userId, request, fileBuffer)).rejects.toThrow(
        'Track not found in catalog: Non-existent Track',
      )
    })

    it('should return existing setup and create version 2 for same user+car+track+condition', async () => {
      const userId = testUser.id
      const request = createImportConfirmRequest()
      const fileBuffer1 = createValidStoBuffer(request.metadata.notes)
      const fileBuffer2 = createValidStoBuffer(request.metadata.notes + ' modified')

      // First confirm - creates setup and version 1
      const result1 = await confirmService.confirm(userId, request, fileBuffer1)
      expect(result1.versionNo).toBe(1)

      // Second confirm with different file (different sha256)
      const request2 = createImportConfirmRequest()
      const sha256_2 = createHash('sha256').update(fileBuffer2).digest('hex')
      request2.sha256 = sha256_2

      const result2 = await confirmService.confirm(userId, request2, fileBuffer2)
      expect(result2.setupId).toBe(result1.setupId) // Same setup
      expect(result2.versionNo).toBe(2) // Version 2
      expect(result2.sha256).toBe(sha256_2)

      // Verify both versions exist
      const versions = await versionRepository.findBySetupForUser(result1.setupId, userId)
      expect(versions).toHaveLength(2)
      expect(versions[0].versionNo).toBe(1)
      expect(versions[1].versionNo).toBe(2)
      expect(versions[1].parentVersionNo).toBe(1)
    })

    it('should isolate users (A≠B): user A confirm does not affect user B', async () => {
      const request = createImportConfirmRequest()
      const fileBuffer = createValidStoBuffer(request.metadata.notes)

      // User A confirms
      const resultA = await confirmService.confirm(testUserA.id, request, fileBuffer)
      expect(resultA.setupId).toBeDefined()
      expect(resultA.versionNo).toBe(1)

      // User B confirms same car/track/condition
      const resultB = await confirmService.confirm(testUserB.id, request, fileBuffer)
      expect(resultB.setupId).toBeDefined()
      expect(resultB.versionNo).toBe(1)

      // They should have different setup IDs
      expect(resultA.setupId).not.toBe(resultB.setupId)

      // User A should only see their setup
      const setupsA = await setupRepository.findByUser(testUserA.id)
      expect(setupsA).toHaveLength(1)
      expect(setupsA[0].id).toBe(resultA.setupId)

      // User B should only see their setup
      const setupsB = await setupRepository.findByUser(testUserB.id)
      expect(setupsB).toHaveLength(1)
      expect(setupsB[0].id).toBe(resultB.setupId)
    })

    it('should handle different conditions separately for same user+car+track', async () => {
      const userId = testUser.id
      const request1 = createImportConfirmRequest({ category: 'GT3' })
      const request2 = createImportConfirmRequest({ category: 'Wet' })
      const fileBuffer = createValidStoBuffer(request1.metadata.notes)

      // First confirm with GT3 condition
      const result1 = await confirmService.confirm(userId, request1, fileBuffer)
      expect(result1.versionNo).toBe(1)

      // Second confirm with Wet condition - different setup
      const fileBuffer2 = createValidStoBuffer(request2.metadata.notes)
      const sha256_2 = createHash('sha256').update(fileBuffer2).digest('hex')
      request2.sha256 = sha256_2

      const result2 = await confirmService.confirm(userId, request2, fileBuffer2)
      expect(result2.setupId).not.toBe(result1.setupId) // Different setup
      expect(result2.versionNo).toBe(1) // Version 1 for new setup

      // Should have two separate setups
      const setups = await setupRepository.findByUser(userId)
      expect(setups).toHaveLength(2)
    })
  })
})