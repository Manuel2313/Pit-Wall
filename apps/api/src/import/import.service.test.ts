import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
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
import { ImportService } from './import.service'
import { FsStorageAdapter } from '../storage/fs-storage.adapter'
import { extractMetadata } from './metadata-extractor'
import type { StoMetadata } from '@pit-wall/api-contracts'

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

describe.sequential('ImportService', () => {
  let db: DataSource
  let carRepository: Repository<Car>
  let trackRepository: Repository<Track>
  let importService: ImportService
  let storageAdapter: FsStorageAdapter

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

    carRepository = db.getRepository(Car)
    trackRepository = db.getRepository(Track)

    // Seed catalog cars
    await carRepository.save([
      { id: '11111111-1111-1111-1111-111111111111', name: 'Ferrari 296 GT3', category: 'GT3' },
      { id: '22222222-2222-2222-2222-222222222222', name: 'Mustang GT3', category: 'GT3' },
      { id: '33333333-3333-3333-3333-333333333333', name: 'Mercedes-AMG GT3', category: 'GT3' },
      { id: '44444444-4444-4444-4444-444444444444', name: 'Porsche 911 GT3 Cup 992', category: 'Porsche Cup' },
    ])

    // Create a mock storage adapter using a temp directory
    const tmpDir = '/tmp/pit-wall-test-storage'
    storageAdapter = new FsStorageAdapter(tmpDir)

    importService = new ImportService(storageAdapter, carRepository, trackRepository)
  })

  afterAll(async () => {
    await db.destroy()
  })

  beforeEach(async () => {
    resetCounters()
  })

  describe('extractMetadata', () => {
    it('should match Ferrari 296 GT3 from notes and extract GT3 category', () => {
      const cars = [
        { id: '1', name: 'Ferrari 296 GT3', category: 'GT3' } as Car,
        { id: '2', name: 'Mustang GT3', category: 'GT3' } as Car,
      ]

      const notesText = 'Some notes with Ferrari 296 GT3 car info'
      const metadata = extractMetadata(notesText, cars)

      expect(metadata.car).toBe('Ferrari 296 GT3')
      expect(metadata.category).toBe('GT3')
    })

    it('should match Porsche 911 GT3 Cup 992 and extract Porsche Cup category', () => {
      const cars = [
        { id: '4', name: 'Porsche 911 GT3 Cup 992', category: 'Porsche Cup' } as Car,
      ]

      const notesText = 'Porsche 911 GT3 Cup 992 setup notes'
      const metadata = extractMetadata(notesText, cars)

      expect(metadata.car).toBe('Porsche 911 GT3 Cup 992')
      expect(metadata.category).toBe('Porsche Cup')
    })

    it('should return Unknown Car and Unknown category when no match', () => {
      const cars = [
        { id: '1', name: 'Ferrari 296 GT3', category: 'GT3' } as Car,
      ]

      const notesText = 'Unknown car setup'
      const metadata = extractMetadata(notesText, cars)

      expect(metadata.car).toBe('Unknown Car')
      expect(metadata.category).toBe('Unknown')
    })

    it('should include full notes text in metadata', () => {
      const cars = [
        { id: '1', name: 'Ferrari 296 GT3', category: 'GT3' } as Car,
      ]

      const notesText = 'Ferrari 296 GT3 setup for Spa track with specific tire pressures'
      const metadata = extractMetadata(notesText, cars)

      expect(metadata.notes).toBe(notesText)
    })
  })

  describe('preview', () => {
    // Helper to create a valid .sto file buffer
    function createValidStoBuffer(notesText: string): Buffer {
      // Payload needs at least 16 bytes (reserved1 + reserved2 + notes)
      // Notes are UTF-16LE + 2 byte NUL terminator
      const utf16Notes = Buffer.alloc(notesText.length * 2 + 2)
      for (let i = 0; i < notesText.length; i++) {
        const code = notesText.charCodeAt(i)
        utf16Notes[i * 2] = code & 0xff
        utf16Notes[i * 2 + 1] = (code >>> 8) & 0xff
      }
      // Last 2 bytes are already 0 (NUL terminator)

      // Payload: 8 bytes reserved + notes
      const payloadSize = 8 + utf16Notes.length
      const payload = Buffer.alloc(payloadSize)
      // reserved1 (4 bytes) = 0
      // reserved2 (4 bytes) = 0
      utf16Notes.copy(payload, 8)

      const fs = payloadSize
      const prefix = Buffer.alloc(8)
      prefix.writeUInt32LE(0x0003, 0) // Magic = 3 (little-endian)
      prefix.writeUInt32LE(fs, 4) // File size

      const trailer = Buffer.alloc(8) // 8 zero bytes terminator

      return Buffer.concat([prefix, payload, trailer])
    }

    it('should return metadata and sha256 for valid .sto file', async () => {
      const notesText = 'Ferrari 296 GT3 setup for Spa-Francorchamps'
      const fileBuffer = createValidStoBuffer(notesText)

      const file = {
        buffer: fileBuffer,
        originalname: 'setup.sto',
        mimetype: 'application/octet-stream',
        size: fileBuffer.length,
      } as Express.Multer.File

      const result = await importService.preview(file)

      expect(result.sha256).toBeDefined()
      expect(result.sha256).toHaveLength(64)
      expect(result.metadata.car).toBe('Ferrari 296 GT3')
      expect(result.metadata.category).toBe('GT3')
      expect(result.metadata.notes).toBe(notesText)
    })

    it('should include htmlOverlay when valid .htm file provided', async () => {
      const notesText = 'Ferrari 296 GT3 setup'
      const fileBuffer = createValidStoBuffer(notesText)

      // Create a minimal Ferrari HTML export matching the expected format (no indentation for regex matching)
      const htmlContent = `<html>
<body>
ferrari296gt3
<H2><U>LEFT FRONT:</U></H2>
Starting pressure:<U>27.5 psi</U><br>
Camber:<U>-3.5 deg</U><br>
Ride height:<U>50 mm</U><br>
Spring rate:<U>150 N/mm</U><br>
<H2><U>RIGHT FRONT:</U></H2>
Starting pressure:<U>27.5 psi</U><br>
Camber:<U>-3.5 deg</U><br>
Ride height:<U>50 mm</U><br>
Spring rate:<U>150 N/mm</U><br>
<H2><U>LEFT REAR:</U></H2>
Starting pressure:<U>28.0 psi</U><br>
Camber:<U>-2.0 deg</U><br>
Ride height:<U>55 mm</U><br>
Spring rate:<U>180 N/mm</U><br>
Toe-in:<U>0.1 deg</U><br>
<H2><U>RIGHT REAR:</U></H2>
Starting pressure:<U>28.0 psi</U><br>
Camber:<U>-2.0 deg</U><br>
Ride height:<U>55 mm</U><br>
Spring rate:<U>180 N/mm</U><br>
Toe-in:<U>0.1 deg</U><br>
</body>
</html>`

      const file = {
        buffer: fileBuffer,
        originalname: 'setup.sto',
        mimetype: 'application/octet-stream',
        size: fileBuffer.length,
      } as Express.Multer.File

      const htmlFile = {
        buffer: Buffer.from(htmlContent, 'utf-8'),
        originalname: 'setup.htm',
        mimetype: 'text/html',
        size: Buffer.byteLength(htmlContent, 'utf-8'),
      } as Express.Multer.File

      const result = await importService.preview(file, htmlFile)

      expect(result.htmlOverlay).toBeDefined()
      expect(result.htmlOverlay?.categories).toBeDefined()
    })

    it('should throw BadRequestException for corrupt .sto file (wrong magic)', async () => {
      const fileBuffer = Buffer.from('not a valid sto file')

      const file = {
        buffer: fileBuffer,
        originalname: 'setup.sto',
        mimetype: 'application/octet-stream',
        size: fileBuffer.length,
      } as Express.Multer.File

      await expect(importService.preview(file)).rejects.toThrow('Corrupt or unsupported .sto file')
    })

    it('should throw BadRequestException for truncated .sto file', async () => {
      const fileBuffer = Buffer.from([0x31, 0x4f, 0x54, 0x53, 0x00, 0x00, 0x00, 0x00]) // Just magic, no payload/trailer

      const file = {
        buffer: fileBuffer,
        originalname: 'setup.sto',
        mimetype: 'application/octet-stream',
        size: fileBuffer.length,
      } as Express.Multer.File

      await expect(importService.preview(file)).rejects.toThrow('Corrupt or unsupported .sto file')
    })

    it('should throw BadRequestException for unsupported format', async () => {
      const fileBuffer = Buffer.from('random data')

      const file = {
        buffer: fileBuffer,
        originalname: 'setup.txt',
        mimetype: 'text/plain',
        size: fileBuffer.length,
      } as Express.Multer.File

      await expect(importService.preview(file)).rejects.toThrow('Corrupt or unsupported .sto file')
    })

    it('should return different sha256 for different files (A≠B isolation)', async () => {
      const notesText1 = 'Ferrari 296 GT3 setup A'
      const notesText2 = 'Ferrari 296 GT3 setup B'

      const fileBuffer1 = createValidStoBuffer(notesText1)
      const fileBuffer2 = createValidStoBuffer(notesText2)

      const file1 = {
        buffer: fileBuffer1,
        originalname: 'setup1.sto',
        mimetype: 'application/octet-stream',
        size: fileBuffer1.length,
      } as Express.Multer.File

      const file2 = {
        buffer: fileBuffer2,
        originalname: 'setup2.sto',
        mimetype: 'application/octet-stream',
        size: fileBuffer2.length,
      } as Express.Multer.File

      const result1 = await importService.preview(file1)
      const result2 = await importService.preview(file2)

      expect(result1.sha256).not.toBe(result2.sha256)
      expect(result1.metadata.notes).toBe(notesText1)
      expect(result2.metadata.notes).toBe(notesText2)
    })
  })
})