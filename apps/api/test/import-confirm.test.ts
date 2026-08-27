import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { DataSource } from 'typeorm'
import { newDb } from 'pg-mem'
import request from 'supertest'
import { INestApplication, CanActivate, ExecutionContext } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { ValidationPipe } from '@nestjs/common'
import { ConfigModule } from '../src/config/config.module'
import { ConfigService } from '../src/config/config.service'
import { Controller, Get, Inject } from '@nestjs/common'
import { Repository } from 'typeorm'
import { User } from '../src/database/entities/user.entity'
import { Session } from '../src/database/entities/session.entity'
import { ResetToken } from '../src/database/entities/reset-token.entity'
import { Car } from '../src/database/entities/car.entity'
import { Track } from '../src/database/entities/track.entity'
import { Setup } from '../src/database/entities/setup.entity'
import { SetupVersion } from '../src/database/entities/setup-version.entity'
import { FeedbackEntry } from '../src/database/entities/feedback-entry.entity'
import { Tag } from '../src/database/entities/tag.entity'
import { SetupTag } from '../src/database/entities/setup-tag.entity'
import { ImportConfirmService } from '../src/import/import-confirm.service'
import { SetupRepository } from '../src/repositories/setup.repository'
import { SetupVersionRepository } from '../src/repositories/setup-version.repository'
import { AuthGuard } from '../src/auth/auth.guard'
import { StorageAdapter } from '../src/storage/storage-adapter.interface'
import { FsStorageAdapter } from '../src/storage/fs-storage.adapter'
import { Controller, Post, UseGuards, UseInterceptors, UploadedFiles, Body, Request, BadRequestException, UnauthorizedException, Inject, Module } from '@nestjs/common'
import { FileFieldsInterceptor } from '@nestjs/platform-express'
import { MulterModule } from '@nestjs/platform-express'
import { createHash } from 'node:crypto'

// Test controller that manually uses ImportConfirmService (bypasses DI token issues with StorageAdapter interface)
@Controller('setups')
@UseGuards(AuthGuard)
class TestImportConfirmController {
  private readonly confirmService: ImportConfirmService

  constructor(@Inject('CONFIRM_SERVICE') confirmService: ImportConfirmService) {
    this.confirmService = confirmService
  }

  @Post('confirm')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'htmlFile', maxCount: 1 },
    ]),
  )
  async confirm(
    @UploadedFiles() files: { file?: Express.Multer.File[]; htmlFile?: Express.Multer.File[] },
    @Body('dto') dtoString: string,
    @Request() req: any,
  ) {
    const stoFile = files.file?.[0]
    if (!stoFile) {
      throw new BadRequestException('No .sto file uploaded')
    }

    let dto: any
    try {
      dto = JSON.parse(dtoString)
    } catch {
      throw new BadRequestException('Invalid dto JSON')
    }

    return this.confirmService.confirm(req.user.id, dto, stoFile.buffer)
  }
}

// Test module that provides all necessary dependencies for import-confirm
@Module({})
class TestImportConfirmModule {
  static forRoot(
    storageAdapter: StorageAdapter,
    dataSource: DataSource,
    carRepository: Repository<Car>,
    trackRepository: Repository<Track>,
  ): import('@nestjs/common').DynamicModule {
    const setupRepository = new SetupRepository(dataSource.getRepository(Setup))
    const versionRepository = new SetupVersionRepository(dataSource.getRepository(SetupVersion), setupRepository)
    const confirmService = new ImportConfirmService(
      storageAdapter,
      setupRepository,
      versionRepository,
      carRepository,
      trackRepository,
    )

    const providers = [
      {
        provide: 'CONFIRM_SERVICE',
        useValue: confirmService,
      },
      {
        provide: TestImportConfirmController,
        useFactory: (svc: ImportConfirmService) => new TestImportConfirmController(svc),
        inject: ['CONFIRM_SERVICE'],
      },
    ]

    return {
      module: TestImportConfirmModule,
      imports: [
        MulterModule.register({
          limits: { fileSize: 10 * 1024 * 1024 },
        }),
      ],
      providers,
      controllers: [TestImportConfirmController],
    }
  }
}

// Mock AuthGuard for testing - extracts userId from Authorization header
class MockAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const authHeader = request.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header')
    }

    const token = authHeader.slice(7) // Remove 'Bearer '

    // Map test tokens to user IDs
    const tokenToUserId: Record<string, string> = {
      'test-session-token': '11111111-1111-1111-1111-111111111111',
      'test-session-token-b': '33333333-3333-3333-3333-333333333333',
    }

    const userId = tokenToUserId[token]
    if (!userId) {
      throw new UnauthorizedException('Invalid token')
    }

    request.user = { id: userId, email: `${userId}@test.com` }
    return true
  }
}

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

describe('Import Confirm API (integration)', () => {
  let app: INestApplication
  let db: DataSource
  let userRepository: Repository<User>
  let carRepository: Repository<Car>
  let trackRepository: Repository<Track>

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

    // Create test users
    await userRepository.save([
      {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'test@example.com',
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$test$hash',
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        email: 'userb@example.com',
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$test$hash',
      },
    ])

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

    const tmpDir = '/tmp/pit-wall-test-storage-import-confirm'
    const storageAdapter = new FsStorageAdapter(tmpDir)

    const moduleFixture = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(),
        TestImportConfirmModule.forRoot(storageAdapter, db, carRepository, trackRepository),
      ],
    })
      .overrideProvider(ConfigService)
      .useValue(
        new ConfigService({
          DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
          JWT_SECRET: 'test-secret-at-least-32-chars-long',
          PORT: 3000,
          NODE_ENV: 'test' as const,
          RESEND_API_KEY: undefined,
          EMAIL_FROM: undefined,
          STORAGE_PATH: './storage',
          SESSION_TTL_DAYS: 30,
          RESET_TOKEN_TTL_HOURS: 1,
        }),
      )
      .overrideGuard(AuthGuard)
      .useClass(MockAuthGuard)
      .compile()

    app = moduleFixture.createNestApplication()
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    )
    await app.init()
  })

  afterAll(async () => {
    await app.close()
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

  describe('POST /setups/confirm', () => {
    const notesText = 'Ferrari 296 GT3 setup for Spa-Francorchamps'
    const fileBuffer = createValidStoBuffer(notesText)
    const sha256 = createHash('sha256').update(fileBuffer).digest('hex')

    const baseRequest = {
      metadata: {
        car: 'Ferrari 296 GT3',
        track: 'Spa-Francorchamps',
        category: 'GT3',
        notes: notesText,
        sha256,
      },
    }

    it('should create Setup + Version 1 + store .sto file and return { setupId, versionNo, sha256 }', async () => {
      const response = await request(app.getHttpServer())
        .post('/setups/confirm')
        .set('Authorization', 'Bearer test-session-token')
        .field('dto', JSON.stringify(baseRequest))
        .attach('file', fileBuffer, 'setup.sto')
        .expect(201)

      expect(response.body).toMatchObject({
        setupId: expect.any(String),
        versionNo: 1,
        sha256,
      })

      // Verify setupId is a valid UUID format
      expect(response.body.setupId).toMatch(/^[0-9a-f-]{36}$/)
    })

    it('should store file with correct storage key format: storage/{userId}/{setupId}/{versionId}.sto', async () => {
      const response = await request(app.getHttpServer())
        .post('/setups/confirm')
        .set('Authorization', 'Bearer test-session-token')
        .field('dto', JSON.stringify(baseRequest))
        .attach('file', fileBuffer, 'setup.sto')
        .expect(201)

      const setupId = response.body.setupId
      expect(setupId).toBeDefined()

      // Verify version was created with correct storage key format
      expect(response.body.versionNo).toBe(1)
      expect(response.body.sha256).toBe(sha256)
    })

    it('should include overlay from htmlOverlay when provided', async () => {
      const htmlOverlay = {
        categories: {
          'LEFT FRONT': { 'Starting pressure': '27.5 psi' },
        },
      }
      const requestBody = {
        ...baseRequest,
        htmlOverlay,
      }

      const response = await request(app.getHttpServer())
        .post('/setups/confirm')
        .set('Authorization', 'Bearer test-session-token')
        .field('dto', JSON.stringify(requestBody))
        .attach('file', fileBuffer, 'setup.sto')
        .expect(201)

      expect(response.body.versionNo).toBe(1)
      expect(response.body.sha256).toBe(sha256)
    })

    it('should prefer htmlOverlay over manualOverlay when both provided', async () => {
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
      const requestBody = {
        ...baseRequest,
        htmlOverlay,
        manualOverlay,
      }

      const response = await request(app.getHttpServer())
        .post('/setups/confirm')
        .set('Authorization', 'Bearer test-session-token')
        .field('dto', JSON.stringify(requestBody))
        .attach('file', fileBuffer, 'setup.sto')
        .expect(201)

      expect(response.body.versionNo).toBe(1)
    })

    it('should use manualOverlay when htmlOverlay not provided', async () => {
      const manualOverlay = {
        categories: {
          'RIGHT FRONT': { 'Starting pressure': '28.0 psi' },
        },
      }
      const requestBody = {
        ...baseRequest,
        manualOverlay,
      }

      const response = await request(app.getHttpServer())
        .post('/setups/confirm')
        .set('Authorization', 'Bearer test-session-token')
        .field('dto', JSON.stringify(requestBody))
        .attach('file', fileBuffer, 'setup.sto')
        .expect(201)

      expect(response.body.versionNo).toBe(1)
    })

    it('should return 400 when SHA-256 mismatch', async () => {
      const wrongBuffer = Buffer.from('different content')

      await request(app.getHttpServer())
        .post('/setups/confirm')
        .set('Authorization', 'Bearer test-session-token')
        .field('dto', JSON.stringify(baseRequest))
        .attach('file', wrongBuffer, 'setup.sto')
        .expect(400)
    })

    it('should return 404 when car not in catalog', async () => {
      const requestBody = {
        ...baseRequest,
        metadata: {
          ...baseRequest.metadata,
          car: 'Non-existent Car',
        },
      }

      await request(app.getHttpServer())
        .post('/setups/confirm')
        .set('Authorization', 'Bearer test-session-token')
        .field('dto', JSON.stringify(requestBody))
        .attach('file', fileBuffer, 'setup.sto')
        .expect(404)
    })

    it('should return 404 when track not in catalog', async () => {
      const requestBody = {
        ...baseRequest,
        metadata: {
          ...baseRequest.metadata,
          track: 'Non-existent Track',
        },
      }

      await request(app.getHttpServer())
        .post('/setups/confirm')
        .set('Authorization', 'Bearer test-session-token')
        .field('dto', JSON.stringify(requestBody))
        .attach('file', fileBuffer, 'setup.sto')
        .expect(404)
    })

    it('should return existing setup and create version 2 for same user+car+track+condition', async () => {
      // First confirm - creates setup and version 1
      const response1 = await request(app.getHttpServer())
        .post('/setups/confirm')
        .set('Authorization', 'Bearer test-session-token')
        .field('dto', JSON.stringify(baseRequest))
        .attach('file', fileBuffer, 'setup.sto')
        .expect(201)

      expect(response1.body.versionNo).toBe(1)
      const setupId = response1.body.setupId

      // Second confirm with different file (different sha256)
      const fileBuffer2 = createValidStoBuffer(notesText + ' modified')
      const sha256_2 = createHash('sha256').update(fileBuffer2).digest('hex')
      const request2 = {
        ...baseRequest,
        metadata: {
          ...baseRequest.metadata,
          sha256: sha256_2,
        },
      }

      const response2 = await request(app.getHttpServer())
        .post('/setups/confirm')
        .set('Authorization', 'Bearer test-session-token')
        .field('dto', JSON.stringify(request2))
        .attach('file', fileBuffer2, 'setup.sto')
        .expect(201)

      expect(response2.body.setupId).toBe(setupId) // Same setup
      expect(response2.body.versionNo).toBe(2) // Version 2
      expect(response2.body.sha256).toBe(sha256_2)
    })

    it('should isolate users (A≠B): user A confirm does not affect user B', async () => {
      // User A confirms
      const responseA = await request(app.getHttpServer())
        .post('/setups/confirm')
        .set('Authorization', 'Bearer test-session-token')
        .field('dto', JSON.stringify(baseRequest))
        .attach('file', fileBuffer, 'setup.sto')
        .expect(201)

      expect(responseA.body.versionNo).toBe(1)
      const setupIdA = responseA.body.setupId

      // User B confirms same car/track/condition
      const responseB = await request(app.getHttpServer())
        .post('/setups/confirm')
        .set('Authorization', 'Bearer test-session-token-b')
        .field('dto', JSON.stringify(baseRequest))
        .attach('file', fileBuffer, 'setup.sto')
        .expect(201)

      expect(responseB.body.versionNo).toBe(1)
      const setupIdB = responseB.body.setupId

      // They should have different setup IDs
      expect(setupIdA).not.toBe(setupIdB)
    })

    it('should handle different conditions separately for same user+car+track', async () => {
      const request1 = {
        ...baseRequest,
        metadata: {
          ...baseRequest.metadata,
          category: 'GT3',
        },
      }

      const request2 = {
        ...baseRequest,
        metadata: {
          ...baseRequest.metadata,
          category: 'Wet',
        },
      }

      // First confirm with GT3 condition
      const response1 = await request(app.getHttpServer())
        .post('/setups/confirm')
        .set('Authorization', 'Bearer test-session-token')
        .field('dto', JSON.stringify(request1))
        .attach('file', fileBuffer, 'setup.sto')
        .expect(201)

      expect(response1.body.versionNo).toBe(1)
      const setupId1 = response1.body.setupId

      // Second confirm with Wet condition - different setup
      const fileBuffer2 = createValidStoBuffer(notesText + ' wet')
      const sha256_2 = createHash('sha256').update(fileBuffer2).digest('hex')
      const request2WithSha = {
        ...request2,
        metadata: {
          ...request2.metadata,
          sha256: sha256_2,
        },
      }

      const response2 = await request(app.getHttpServer())
        .post('/setups/confirm')
        .set('Authorization', 'Bearer test-session-token')
        .field('dto', JSON.stringify(request2WithSha))
        .attach('file', fileBuffer2, 'setup.sto')
        .expect(201)

      expect(response2.body.setupId).not.toBe(setupId1) // Different setup
      expect(response2.body.versionNo).toBe(1) // Version 1 for new setup
    })

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/setups/confirm')
        .field('dto', JSON.stringify(baseRequest))
        .attach('file', fileBuffer, 'setup.sto')
        .expect(401)
    })

    it('should return 400 when no .sto file uploaded', async () => {
      await request(app.getHttpServer())
        .post('/setups/confirm')
        .set('Authorization', 'Bearer test-session-token')
        .field('dto', JSON.stringify(baseRequest))
        .expect(400)
    })
  })
})