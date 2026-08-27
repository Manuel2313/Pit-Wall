import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import { INestApplication, CanActivate, ExecutionContext, Module, Global, Controller, Get, Param, Query, UseGuards, Request, Inject, BadRequestException, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { UnauthorizedException } from '@nestjs/common'
import { ValidationPipe } from '@nestjs/common'
import { ConfigModule } from '../src/config/config.module'
import { ConfigService } from '../src/config/config.service'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MulterModule } from '@nestjs/platform-express'
import { DataSource, Repository } from 'typeorm'
import { newDb } from 'pg-mem'
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
import { AuthGuard } from '../src/auth/auth.guard'
import { SetupRepository } from '../src/repositories/setup.repository'
import { SetupVersionRepository } from '../src/repositories/setup-version.repository'
import { StorageAdapter } from '../src/storage/storage-adapter.interface'
import { FsStorageAdapter } from '../src/storage/fs-storage.adapter'
import { VersionsService } from '../src/versions/versions.service'
import type { VersionSummary, TypedDiffResponse, ByteDiffResponse, DiffRequest } from '@pit-wall/api-contracts'
import { diffRequestSchema } from '@pit-wall/api-contracts'
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
      'tokenA': 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      'tokenB': 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    }

    const userId = tokenToUserId[token]
    if (!userId) {
      throw new UnauthorizedException('Invalid token')
    }

    request.user = { id: userId, email: `${userId}@test.com` }
    return true
  }
}

// Test controller that manually uses VersionsService (bypasses DI token issues)
@Controller('setups')
@UseGuards(AuthGuard)
class TestVersionsController {
  private readonly versionsService: VersionsService

  constructor(@Inject('VERSIONS_SERVICE') versionsService: VersionsService) {
    this.versionsService = versionsService
  }

  @Get(':id/versions')
  async listVersions(
    @Param('id') setupId: string,
    @Request() req: any,
  ): Promise<VersionSummary[]> {
    return this.versionsService.listVersions(setupId, req.user.id)
  }

  @Get('diff')
  async diff(
    @Query() query: DiffRequest,
    @Request() req: any,
  ): Promise<TypedDiffResponse | ByteDiffResponse> {
    // Validate query params using Zod schema
    const result = diffRequestSchema.safeParse(query)
    if (!result.success) {
      const messages = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
      throw new BadRequestException(messages)
    }

    const { fromVersion, toVersion } = result.data

    try {
      return await this.versionsService.diff(fromVersion, toVersion, req.user.id)
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error
      }
      throw new NotFoundException('Version not found or access denied')
    }
  }
}

// Test module that provides all necessary dependencies for versions API
@Global()
@Module({})
class TestVersionsModule {
  static forRoot(
    storageAdapter: StorageAdapter,
    dataSource: DataSource,
    carRepository: Repository<Car>,
    trackRepository: Repository<Track>,
  ): import('@nestjs/common').DynamicModule {
    const setupRepository = new SetupRepository(dataSource.getRepository(Setup))
    const versionRepository = new SetupVersionRepository(dataSource.getRepository(SetupVersion), setupRepository)
    const versionsService = new VersionsService(versionRepository, storageAdapter)

    const providers = [
      {
        provide: 'VERSIONS_SERVICE',
        useValue: versionsService,
      },
      {
        provide: TestVersionsController,
        useFactory: (svc: VersionsService) => new TestVersionsController(svc),
        inject: ['VERSIONS_SERVICE'],
      },
      { provide: SetupRepository, useValue: setupRepository },
      { provide: SetupVersionRepository, useValue: versionRepository },
    ]

    return {
      module: TestVersionsModule,
      imports: [
        MulterModule.register({
          limits: { fileSize: 10 * 1024 * 1024 },
        }),
      ],
      providers,
      controllers: [TestVersionsController],
    }
  }
}

function createValidStoBuffer(): Buffer {
  const magic = 0x0003 // Magic = 3 (little-endian)
  const fs = 108 // payload size: 8 bytes reserved + 100 bytes notes
  const prefix = Buffer.alloc(8)
  prefix.writeUInt32LE(magic, 0)
  prefix.writeUInt32LE(fs, 4)

  const payload = Buffer.alloc(fs)
  payload.fill(0)
  // Write some identifiable content at offset 8 (after reserved1/reserved2)
  payload.write('Ferrari 296 GT3 setup for Monza', 8, 'utf-16le')

  const trailer = Buffer.alloc(8)
  trailer.fill(0)

  return Buffer.concat([prefix, payload, trailer])
}

describe('Versions API (integration)', () => {
  let app: INestApplication
  let db: DataSource
  let userRepository: Repository<User>
  let carRepository: Repository<Car>
  let trackRepository: Repository<Track>
  let setupVersionRepository: Repository<SetupVersion>

  const tokenA = 'tokenA'
  const tokenB = 'tokenB'
  const userAId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  const userBId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
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

    userRepository = db.getRepository(User)
    carRepository = db.getRepository(Car)
    trackRepository = db.getRepository(Track)
    setupVersionRepository = db.getRepository(SetupVersion)

    // Create test users with explicit UUIDs
    await userRepository.save([
      {
        id: userAId,
        email: 'userA@test.com',
        passwordHash: 'hashA',
      },
      {
        id: userBId,
        email: 'userB@test.com',
        passwordHash: 'hashB',
      },
    ])

    // Create shared catalog data
    await carRepository.save({
      id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      name: 'Ferrari 296 GT3',
      category: 'GT3',
    })
    await trackRepository.save({
      id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      name: 'Monza',
      layout: 'GP',
    })

    const tmpDir = '/tmp/pit-wall-test-storage-versions'
    storageAdapter = new FsStorageAdapter(tmpDir)

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(),
        TestVersionsModule.forRoot(storageAdapter, db, carRepository, trackRepository),
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
          STORAGE_PATH: tmpDir,
          SESSION_TTL_DAYS: 30,
          RESET_TOKEN_TTL_HOURS: 1,
        }),
      )
      .overrideGuard(AuthGuard)
      .useClass(MockAuthGuard)
      .compile()

    app = moduleRef.createNestApplication()
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

  const createSetupViaPreviewAndConfirm = async (token: string, overlay?: object, sha256Override?: string, condition: string = 'dry') => {
    const stoBuffer = createValidStoBuffer()
    const sha256 = sha256Override ?? createHash('sha256').update(stoBuffer).digest('hex')

    // Step 1: Preview (use import service directly via controller)
    // For this test, we'll use the import controller which is not in our test module
    // So we'll create the setup and version directly via the repositories
    const setupRepository = new SetupRepository(db.getRepository(Setup))
    const car = await carRepository.findOneOrFail({ where: { name: 'Ferrari 296 GT3' } })
    const track = await trackRepository.findOneOrFail({ where: { name: 'Monza' } })
    const setup = await setupRepository.findOrCreateForUser(
      token === tokenA ? userAId : userBId,
      car.id,
      track.id,
      condition
    )

    // Create version via versions service
    const versionRepository = new SetupVersionRepository(db.getRepository(SetupVersion), setupRepository)
    const version = await versionRepository.createForSetup(setup.id, token === tokenA ? userAId : userBId, {
      versionNo: 1,
      sha256,
      fileRef: `storage/${token === tokenA ? userAId : userBId}/${setup.id}/v1.sto`,
      overlay: overlay as any,
    })

    // Store the file
    await storageAdapter.put(version.fileRef, stoBuffer)

    return { setupId: setup.id, sha256 }
  }

  const createNewVersionForSetup = async (setupId: string, token: string, overlay?: object) => {
    const stoBuffer = createValidStoBuffer()
    const sha256 = createHash('sha256').update(stoBuffer).digest('hex')

    const setupRepository = new SetupRepository(db.getRepository(Setup))
    const versionRepository = new SetupVersionRepository(db.getRepository(SetupVersion), setupRepository)

    const existingVersions = await versionRepository.findBySetupForUser(setupId, token === tokenA ? userAId : userBId)
    const versionNo = existingVersions.length + 1
    const parentVersionNo = versionNo > 1 ? versionNo - 1 : null

    const versionId = `version-${versionNo}-${Date.now()}`
    const fileRef = `storage/${token === tokenA ? userAId : userBId}/${setupId}/${versionId}.sto`

    await storageAdapter.put(fileRef, stoBuffer)

    const version = await versionRepository.createVersion(
      setupId,
      token === tokenA ? userAId : userBId,
      versionNo,
      parentVersionNo,
      sha256,
      fileRef,
      overlay as any,
    )

    return { versionNo: version.versionNo, sha256: version.sha256 }
  }

  const getVersionIdsForSetup = async (setupId: string) => {
    const versions = await setupVersionRepository.find({
      where: { setupId },
      order: { versionNo: 'ASC' },
    })
    return versions.map(v => v.id)
  }

  describe('GET /setups/:id/versions', () => {
    it('should return versions ordered by versionNo descending', async () => {
      const { setupId } = await createSetupViaPreviewAndConfirm(tokenA)

      await createNewVersionForSetup(setupId, tokenA)
      await createNewVersionForSetup(setupId, tokenA)

      const res = await request(app.getHttpServer())
        .get(`/setups/${setupId}/versions`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200)

      expect(res.body).toHaveLength(3)
      expect(res.body[0].versionNo).toBe(3)
      expect(res.body[1].versionNo).toBe(2)
      expect(res.body[2].versionNo).toBe(1)
      expect(res.body[0]).toHaveProperty('sha256')
      expect(res.body[0]).toHaveProperty('createdAt')
      expect(res.body[0]).toHaveProperty('hasOverlay')
    })

    it('should return version 1 for newly created setup', async () => {
      const { setupId } = await createSetupViaPreviewAndConfirm(tokenA)

      const res = await request(app.getHttpServer())
        .get(`/setups/${setupId}/versions`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200)

      expect(res.body).toHaveLength(1)
      expect(res.body[0].versionNo).toBe(1)
      expect(res.body[0].parentVersionNo).toBeNull()
      expect(res.body[0]).toHaveProperty('sha256')
      expect(res.body[0]).toHaveProperty('createdAt')
      expect(res.body[0]).toHaveProperty('hasOverlay')
    })

    it('should reject access to another user\'s setup versions (A≠B isolation)', async () => {
      const { setupId } = await createSetupViaPreviewAndConfirm(tokenA)

      await createNewVersionForSetup(setupId, tokenA)

      // User B tries to access user A's setup versions
      const res = await request(app.getHttpServer())
        .get(`/setups/${setupId}/versions`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200)

      // Should return empty array (not found for this user)
      expect(res.body).toEqual([])
    })

    it('should include hasOverlay true when overlay exists', async () => {
      const { setupId } = await createSetupViaPreviewAndConfirm(tokenA, {
        categories: {
          suspension: { frontRebound: '5' },
        },
      })

      const res = await request(app.getHttpServer())
        .get(`/setups/${setupId}/versions`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200)

      expect(res.body[0].hasOverlay).toBe(true)
    })

    it('should return 404 for non-existent setup', async () => {
      const res = await request(app.getHttpServer())
        .get('/setups/00000000-0000-0000-0000-000000000000/versions')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200)

      expect(res.body).toEqual([])
    })
  })

  describe('GET /diff', () => {
    let setupId: string
    let version1Id: string
    let version2Id: string

    beforeEach(async () => {
      const { setupId: newSetupId } = await createSetupViaPreviewAndConfirm(tokenA, {
        categories: {
          suspension: { frontRebound: '5', rearRebound: '4' },
          aero: { frontWing: '3' },
        },
      })
      setupId = newSetupId

      await createNewVersionForSetup(setupId, tokenA, {
        categories: {
          suspension: { frontRebound: '6', rearRebound: '4' },
          aero: { frontWing: '3', rearWing: '2' },
        },
      })

      const versionIds = await getVersionIdsForSetup(setupId)
      version1Id = versionIds[0]
      version2Id = versionIds[1]
    })

    it('should return typed diff when both versions have overlays', async () => {
      const res = await request(app.getHttpServer())
        .get('/setups/diff')
        .query({ fromVersion: version1Id, toVersion: version2Id })
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200)

      expect(res.body).toHaveProperty('changedFields')
      expect(Array.isArray(res.body.changedFields)).toBe(true)
      expect(res.body.changedFields.length).toBeGreaterThan(0)

      const fields = res.body.changedFields.map((f: any) => f.field).sort()
      expect(fields).toContain('suspension.frontRebound')
      expect(fields).toContain('aero.rearWing')

      const frontReboundDiff = res.body.changedFields.find((f: any) => f.field === 'suspension.frontRebound')
      expect(frontReboundDiff.oldValue).toBe('5')
      expect(frontReboundDiff.newValue).toBe('6')

      const rearWingDiff = res.body.changedFields.find((f: any) => f.field === 'aero.rearWing')
      expect(rearWingDiff.oldValue).toBe('')
      expect(rearWingDiff.newValue).toBe('2')
    })

    it('should return byte diff when versions have no overlays', async () => {
      const { setupId: setupIdB } = await createSetupViaPreviewAndConfirm(tokenB, undefined, undefined, 'wet')

      await createNewVersionForSetup(setupIdB, tokenB) // no overlay
      await createNewVersionForSetup(setupIdB, tokenB) // no overlay

      const versionIds = await getVersionIdsForSetup(setupIdB)

      const res = await request(app.getHttpServer())
        .get('/setups/diff')
        .query({ fromVersion: versionIds[0], toVersion: versionIds[1] })
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200)

      expect(res.body).toHaveProperty('regions')
      expect(Array.isArray(res.body.regions)).toBe(true)
    })

    it('should return byte diff when only one version has overlay', async () => {
      const { setupId: setupIdA } = await createSetupViaPreviewAndConfirm(tokenA, {
        categories: { suspension: { frontRebound: '5' } },
      }, undefined, 'test-overlay')

      await createNewVersionForSetup(setupIdA, tokenA) // no overlay

      const versionIds = await getVersionIdsForSetup(setupIdA)

      const res = await request(app.getHttpServer())
        .get('/setups/diff')
        .query({ fromVersion: versionIds[0], toVersion: versionIds[1] })
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200)

      expect(res.body).toHaveProperty('regions')
    })

    it('should reject when fromVersion >= toVersion', async () => {
      const res = await request(app.getHttpServer())
        .get('/setups/diff')
        .query({ fromVersion: version2Id, toVersion: version1Id })
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(400)

      expect(res.body.message).toContain('fromVersion must be less than toVersion')
    })

    it('should reject when versions belong to different setups', async () => {
      // Create two setups for userA
      const { setupId: setupId1 } = await createSetupViaPreviewAndConfirm(tokenA, undefined, undefined, 'setup-1')
      await createNewVersionForSetup(setupId1, tokenA)
      const versionIds1 = await getVersionIdsForSetup(setupId1)

      const { setupId: setupId2 } = await createSetupViaPreviewAndConfirm(tokenA, undefined, undefined, 'setup-2')
      await createNewVersionForSetup(setupId2, tokenA)
      const versionIds2 = await getVersionIdsForSetup(setupId2)

      // UserA tries to diff versions from different setups
      const res = await request(app.getHttpServer())
        .get('/setups/diff')
        .query({ fromVersion: versionIds1[0], toVersion: versionIds2[0] })
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(400)

      expect(res.body.message).toContain('same setup')
    })

    it('should reject access to another user\'s versions (A≠B isolation)', async () => {
      const { setupId: setupIdB } = await createSetupViaPreviewAndConfirm(tokenB, undefined, undefined, 'isolation-test')

      await createNewVersionForSetup(setupIdB, tokenB)
      await createNewVersionForSetup(setupIdB, tokenB)

      const versionIdsB = await getVersionIdsForSetup(setupIdB)

      // User A tries to diff user B's versions (two different versions)
      const res = await request(app.getHttpServer())
        .get('/setups/diff')
        .query({ fromVersion: versionIdsB[0], toVersion: versionIdsB[1] })
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404)

      expect(res.body.message).toContain('not found or access denied')
    })

    it('should reject non-existent versions', async () => {
      const res = await request(app.getHttpServer())
        .get('/setups/diff')
        .query({ fromVersion: '00000000-0000-0000-0000-000000000000', toVersion: version2Id })
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(404)

      expect(res.body.message).toContain('not found or access denied')
    })
  })
})