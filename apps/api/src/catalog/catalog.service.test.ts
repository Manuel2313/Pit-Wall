import { describe, it, expect, beforeAll, afterAll } from 'vitest'
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
import { CatalogService } from './catalog.service'

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

describe.sequential('CatalogService', () => {
  let db: DataSource
  let carRepository: Repository<Car>
  let trackRepository: Repository<Track>
  let catalogService: CatalogService
  let seeded = false

  beforeAll(async () => {
    genRandomUuidCounter = 0
    uuidGenerateV4Counter = 0

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

    catalogService = new CatalogService(carRepository, trackRepository)

    // Seed catalog data once for all tests using explicit UUIDs to avoid pg-mem UUID generator issues
    await carRepository.save([
      { id: '11111111-1111-1111-1111-111111111111', name: 'Ferrari 296 GT3', category: 'GT3' },
      { id: '22222222-2222-2222-2222-222222222222', name: 'Mustang GT3', category: 'GT3' },
      { id: '33333333-3333-3333-3333-333333333333', name: 'Mercedes-AMG GT3', category: 'GT3' },
      { id: '44444444-4444-4444-4444-444444444444', name: 'Porsche 911 GT3 Cup 992', category: 'Porsche Cup' },
    ])
    await trackRepository.save([
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
  })

  afterAll(async () => {
    await db.destroy()
  })

  describe('getCars', () => {
    it('should return 4 cars in correct order (alphabetical by name)', async () => {
      const cars = await catalogService.getCars()

      expect(cars).toHaveLength(4)
      expect(cars.map((c) => c.name)).toEqual([
        'Ferrari 296 GT3',
        'Mercedes-AMG GT3',
        'Mustang GT3',
        'Porsche 911 GT3 Cup 992',
      ])
    })

    it('should return cars with correct categories (GT3 ×3, Porsche Cup ×1)', async () => {
      const cars = await catalogService.getCars()

      const gt3Cars = cars.filter((c) => c.category === 'GT3')
      const porscheCupCars = cars.filter((c) => c.category === 'Porsche Cup')

      expect(gt3Cars).toHaveLength(3)
      expect(porscheCupCars).toHaveLength(1)
      expect(porscheCupCars[0].name).toBe('Porsche 911 GT3 Cup 992')
    })

    it('should not have any GT4 category cars', async () => {
      const cars = await catalogService.getCars()

      const gt4Cars = cars.filter((c) => c.category === 'GT4')
      expect(gt4Cars).toHaveLength(0)
    })

    it('should return cars with id, name, category, and createdAt', async () => {
      const cars = await catalogService.getCars()

      for (const car of cars) {
        expect(car.id).toBeDefined()
        expect(car.name).toBeDefined()
        expect(car.category).toBeDefined()
        expect(car.createdAt).toBeDefined()
        expect(new Date(car.createdAt).toString()).not.toBe('Invalid Date')
      }
    })
  })

  describe('getTracks', () => {
    it('should return seeded tracks in correct order (alphabetical by name)', async () => {
      const tracks = await catalogService.getTracks()

      expect(tracks).toHaveLength(10)
      expect(tracks.map((t) => t.name)).toEqual([
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

    it('should return tracks with id, name, layout, and createdAt', async () => {
      const tracks = await catalogService.getTracks()

      for (const track of tracks) {
        expect(track.id).toBeDefined()
        expect(track.name).toBeDefined()
        expect(track.layout).toBeDefined()
        expect(track.createdAt).toBeDefined()
        expect(new Date(track.createdAt).toString()).not.toBe('Invalid Date')
      }
    })

    it('should have at least 5 tracks with layouts', async () => {
      const tracks = await catalogService.getTracks()

      expect(tracks.length).toBeGreaterThanOrEqual(5)
      for (const track of tracks) {
        expect(track.layout).toBeTruthy()
      }
    })
  })
})