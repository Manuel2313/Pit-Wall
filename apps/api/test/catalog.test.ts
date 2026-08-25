import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { DataSource } from 'typeorm'
import { newDb } from 'pg-mem'
import request from 'supertest'
import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { ValidationPipe } from '@nestjs/common'
import { ConfigModule } from '../src/config/config.module'
import { ConfigService } from '../src/config/config.service'
import { Controller, Get, Inject } from '@nestjs/common'
import { Repository } from 'typeorm'
import { Car } from '../src/database/entities/car.entity'
import { Track } from '../src/database/entities/track.entity'
import { User } from '../src/database/entities/user.entity'
import { Session } from '../src/database/entities/session.entity'
import { ResetToken } from '../src/database/entities/reset-token.entity'
import { Setup } from '../src/database/entities/setup.entity'
import { SetupVersion } from '../src/database/entities/setup-version.entity'
import { FeedbackEntry } from '../src/database/entities/feedback-entry.entity'
import { Tag } from '../src/database/entities/tag.entity'
import { SetupTag } from '../src/database/entities/setup-tag.entity'

const CAR_REPOSITORY = 'CAR_REPOSITORY'
const TRACK_REPOSITORY = 'TRACK_REPOSITORY'

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

// Test-specific controller that uses the test database repositories
@Controller('catalog')
class TestCatalogController {
  constructor(
    @Inject(CAR_REPOSITORY) private readonly carRepository: Repository<Car>,
    @Inject(TRACK_REPOSITORY) private readonly trackRepository: Repository<Track>,
  ) {}

  @Get('cars')
  async getCars() {
    const cars = await this.carRepository.find({ order: { name: 'ASC' } })
    return cars.map((car) => ({
      id: car.id,
      name: car.name,
      category: car.category,
      createdAt: car.createdAt.toISOString(),
    }))
  }

  @Get('tracks')
  async getTracks() {
    const tracks = await this.trackRepository.find({ order: { name: 'ASC' } })
    return tracks.map((track) => ({
      id: track.id,
      name: track.name,
      layout: track.layout,
      createdAt: track.createdAt.toISOString(),
    }))
  }
}

describe('Catalog API (integration)', () => {
  let app: INestApplication
  let db: DataSource

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

    const moduleFixture = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(),
      ],
      controllers: [TestCatalogController],
      providers: [
        {
          provide: CAR_REPOSITORY,
          useValue: db.getRepository(Car),
        },
        {
          provide: TRACK_REPOSITORY,
          useValue: db.getRepository(Track),
        },
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

    // Manually seed catalog
    const carRepo = db.getRepository(Car)
    const trackRepo = db.getRepository(Track)
    if ((await carRepo.count()) === 0) {
      await carRepo.save([
        { id: '11111111-1111-1111-1111-111111111111', name: 'Ferrari 296 GT3', category: 'GT3' },
        { id: '22222222-2222-2222-2222-222222222222', name: 'Mustang GT3', category: 'GT3' },
        { id: '33333333-3333-3333-3333-333333333333', name: 'Mercedes-AMG GT3', category: 'GT3' },
        { id: '44444444-4444-4444-4444-444444444444', name: 'Porsche 911 GT3 Cup 992', category: 'Porsche Cup' },
      ])
      await trackRepo.save([
        { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Spa-Francorchamps', layout: 'Grand Prix' },
        { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name: 'Monza', layout: 'Grand Prix' },
        { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', name: 'Nürburgring', layout: 'Grand Prix' },
        { id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', name: 'Laguna Seca', layout: 'Full' },
        { id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', name: 'Barcelona-Catalunya', layout: 'Grand Prix' },
        { id: 'ffffffff-ffff-ffff-ffff-ffffffffffff', name: 'Watkins Glen', layout: 'Full' },
        { id: '11111111-2222-3333-4444-555555555555', name: 'Zandvoort', layout: 'Grand Prix' },
        { id: '22222222-3333-4444-5555-666666666666', name: 'Road Atlanta', layout: 'Full' },
        { id: '33333333-4444-5555-6666-777777777777', name: 'Sebring', layout: 'Full' },
        { id: '44444444-5555-6666-7777-888888888888', name: 'Road America', layout: 'Full' },
      ])
    }
  })

  afterAll(async () => {
    await app.close()
    await db.destroy()
  })

  beforeEach(async () => {
    resetCounters()
  })

  describe('GET /catalog/cars', () => {
    it('should return 200 with array of 4 cars', async () => {
      const response = await request(app.getHttpServer()).get('/catalog/cars').expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toHaveLength(4)
    })

    it('should return cars with id, name, category, and createdAt', async () => {
      const response = await request(app.getHttpServer()).get('/catalog/cars').expect(200)

      for (const car of response.body) {
        expect(car.id).toBeDefined()
        expect(typeof car.id).toBe('string')
        expect(car.name).toBeDefined()
        expect(typeof car.name).toBe('string')
        expect(car.category).toBeDefined()
        expect(['GT3', 'Porsche Cup']).toContain(car.category)
        expect(car.createdAt).toBeDefined()
        expect(new Date(car.createdAt).toString()).not.toBe('Invalid Date')
      }
    })

    it('should return cars in alphabetical order by name', async () => {
      const response = await request(app.getHttpServer()).get('/catalog/cars').expect(200)

      const names = response.body.map((c: { name: string }) => c.name)
      expect(names).toEqual([
        'Ferrari 296 GT3',
        'Mercedes-AMG GT3',
        'Mustang GT3',
        'Porsche 911 GT3 Cup 992',
      ])
    })

    it('should have correct categories (GT3 ×3, Porsche Cup ×1)', async () => {
      const response = await request(app.getHttpServer()).get('/catalog/cars').expect(200)

      const gt3Count = response.body.filter((c: { category: string }) => c.category === 'GT3').length
      const porscheCupCount = response.body.filter((c: { category: string }) => c.category === 'Porsche Cup').length

      expect(gt3Count).toBe(3)
      expect(porscheCupCount).toBe(1)
    })

    it('should work without authentication (public endpoint)', async () => {
      // No auth header needed
      await request(app.getHttpServer()).get('/catalog/cars').expect(200)
    })
  })

  describe('GET /catalog/tracks', () => {
    it('should return 200 with array of tracks', async () => {
      const response = await request(app.getHttpServer()).get('/catalog/tracks').expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBeGreaterThanOrEqual(5)
    })

    it('should return tracks with id, name, layout, and createdAt', async () => {
      const response = await request(app.getHttpServer()).get('/catalog/tracks').expect(200)

      for (const track of response.body) {
        expect(track.id).toBeDefined()
        expect(typeof track.id).toBe('string')
        expect(track.name).toBeDefined()
        expect(typeof track.name).toBe('string')
        expect(track.layout).toBeDefined()
        expect(typeof track.layout).toBe('string')
        expect(track.createdAt).toBeDefined()
        expect(new Date(track.createdAt).toString()).not.toBe('Invalid Date')
      }
    })

    it('should return tracks in alphabetical order by name', async () => {
      const response = await request(app.getHttpServer()).get('/catalog/tracks').expect(200)

      const names = response.body.map((t: { name: string }) => t.name)
      expect(names).toEqual([
        'Barcelona-Catalunya',
        'Laguna Seca',
        'Monza',
        'Nürburgring',
        'Road America',
        'Road Atlanta',
        'Sebring',
        'Spa-Francorchamps',
        'Watkins Glen',
        'Zandvoort',
      ])
    })

    it('should work without authentication (public endpoint)', async () => {
      // No auth header needed
      await request(app.getHttpServer()).get('/catalog/tracks').expect(200)
    })
  })
})