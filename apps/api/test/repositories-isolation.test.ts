import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
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
import { SetupRepository } from '../src/repositories/setup.repository'
import { SetupVersionRepository } from '../src/repositories/setup-version.repository'
import { FeedbackRepository } from '../src/repositories/feedback.repository'
import { TagRepository } from '../src/repositories/tag.repository'

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

describe('Tenant-scoped repositories (A≠B isolation)', () => {
  let db: DataSource
  let userRepository: Repository<User>
  let setupRepository: SetupRepository
  let versionRepository: SetupVersionRepository
  let feedbackRepository: FeedbackRepository
  let tagRepository: TagRepository
  let carRepository: Repository<Car>
  let trackRepository: Repository<Track>

  let userA: User
  let userB: User
  let car: Car
  let track: Track

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

    userRepository = db.getRepository(User)
    carRepository = db.getRepository(Car)
    trackRepository = db.getRepository(Track)

    setupRepository = new SetupRepository(db.getRepository(Setup))
    versionRepository = new SetupVersionRepository(db.getRepository(SetupVersion), setupRepository)
    feedbackRepository = new FeedbackRepository(db.getRepository(FeedbackEntry), versionRepository)
    tagRepository = new TagRepository(db.getRepository(Tag), db.getRepository(SetupTag), setupRepository)

    // Create test users with explicit UUIDs
    userA = await userRepository.save({
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      email: 'userA@test.com',
      passwordHash: 'hashA',
    })
    userB = await userRepository.save({
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      email: 'userB@test.com',
      passwordHash: 'hashB',
    })

    // Create shared catalog data with explicit UUIDs
    car = await carRepository.save({
      id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      name: 'Ferrari 296 GT3',
      category: 'GT3',
    })
    track = await trackRepository.save({
      id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      name: 'Monza',
      layout: 'GP',
    })
  })

  afterAll(async () => {
    await db.destroy()
  })

  beforeEach(async () => {
    genRandomUuidCounter = 0
    uuidGenerateV4Counter = 0

    // Clean up user-specific data in correct order (respecting FK constraints)
    await db.createQueryBuilder().delete().from(SetupTag).execute()
    await db.createQueryBuilder().delete().from(Tag).execute()
    await db.createQueryBuilder().delete().from(FeedbackEntry).execute()
    await db.createQueryBuilder().delete().from(SetupVersion).execute()
    await db.createQueryBuilder().delete().from(Setup).execute()
  })

  describe('SetupRepository', () => {
    it('should only return setups owned by the user', async () => {
      const setupA = await setupRepository.createForUser(userA.id, {
        carId: car.id,
        trackId: track.id,
        condition: 'dry',
      })
      const setupB = await setupRepository.createForUser(userB.id, {
        carId: car.id,
        trackId: track.id,
        condition: 'wet',
      })

      const userASetups = await setupRepository.findByUser(userA.id)
      const userBSetups = await setupRepository.findByUser(userB.id)

      expect(userASetups).toHaveLength(1)
      expect(userASetups[0].id).toBe(setupA.id)
      expect(userBSetups).toHaveLength(1)
      expect(userBSetups[0].id).toBe(setupB.id)
    })

    it('should reject finding setup by id for another user', async () => {
      const setupA = await setupRepository.createForUser(userA.id, {
        carId: car.id,
        trackId: track.id,
        condition: 'dry',
      })

      // User A can find their own setup
      const foundByA = await setupRepository.findByIdForUser(setupA.id, userA.id)
      expect(foundByA).not.toBeNull()
      expect(foundByA!.id).toBe(setupA.id)

      // User B cannot find user A's setup
      const foundByB = await setupRepository.findByIdForUser(setupA.id, userB.id)
      expect(foundByB).toBeNull()
    })

    it('should reject updating setup for another user', async () => {
      const setupA = await setupRepository.createForUser(userA.id, {
        carId: car.id,
        trackId: track.id,
        condition: 'dry',
      })

      // User A can update their own setup
      await expect(setupRepository.updateForUser(setupA.id, userA.id, { condition: 'wet' })).resolves.toBeDefined()

      // User B cannot update user A's setup
      await expect(setupRepository.updateForUser(setupA.id, userB.id, { condition: 'wet' })).rejects.toThrow()
    })

    it('should reject deleting setup for another user', async () => {
      const setupA = await setupRepository.createForUser(userA.id, {
        carId: car.id,
        trackId: track.id,
        condition: 'dry',
      })

      // User A can delete their own setup
      await expect(setupRepository.deleteForUser(setupA.id, userA.id)).resolves.toBe(true)

      // Recreate for user B test
      const setupA2 = await setupRepository.createForUser(userA.id, {
        carId: car.id,
        trackId: track.id,
        condition: 'dry',
      })

      // User B cannot delete user A's setup
      await expect(setupRepository.deleteForUser(setupA2.id, userB.id)).rejects.toThrow()
    })
  })

  describe('SetupVersionRepository', () => {
    let setupA: Setup
    let setupB: Setup

    beforeEach(async () => {
      setupA = await setupRepository.createForUser(userA.id, {
        carId: car.id,
        trackId: track.id,
        condition: 'dry',
      })
      setupB = await setupRepository.createForUser(userB.id, {
        carId: car.id,
        trackId: track.id,
        condition: 'wet',
      })
    })

    it('should only return versions for user\'s setups', async () => {
      await versionRepository.createForSetup(setupA.id, userA.id, {
        versionNo: 1,
        sha256: 'a'.repeat(64),
        fileRef: 'storage/userA/setupA/v1.sto',
      })
      await versionRepository.createForSetup(setupB.id, userB.id, {
        versionNo: 1,
        sha256: 'b'.repeat(64),
        fileRef: 'storage/userB/setupB/v1.sto',
      })

      const userAVersions = await versionRepository.findBySetupForUser(setupA.id, userA.id)
      const userBVersions = await versionRepository.findBySetupForUser(setupB.id, userB.id)

      expect(userAVersions).toHaveLength(1)
      expect(userAVersions[0].sha256).toBe('a'.repeat(64))
      expect(userBVersions).toHaveLength(1)
      expect(userBVersions[0].sha256).toBe('b'.repeat(64))
    })

    it('should reject accessing versions of another user\'s setup', async () => {
      await versionRepository.createForSetup(setupA.id, userA.id, {
        versionNo: 1,
        sha256: 'a'.repeat(64),
        fileRef: 'storage/userA/setupA/v1.sto',
      })

      // User A can access their setup's versions
      const userAVersions = await versionRepository.findBySetupForUser(setupA.id, userA.id)
      expect(userAVersions).toHaveLength(1)

      // User B cannot access user A's setup versions
      const userBVersions = await versionRepository.findBySetupForUser(setupA.id, userB.id)
      expect(userBVersions).toHaveLength(0)
    })
  })

  describe('FeedbackRepository', () => {
    let setupA: Setup
    let setupB: Setup
    let versionA: SetupVersion
    let versionB: SetupVersion

    beforeEach(async () => {
      setupA = await setupRepository.createForUser(userA.id, {
        carId: car.id,
        trackId: track.id,
        condition: 'dry',
      })
      setupB = await setupRepository.createForUser(userB.id, {
        carId: car.id,
        trackId: track.id,
        condition: 'wet',
      })

      versionA = await versionRepository.createForSetup(setupA.id, userA.id, {
        versionNo: 1,
        sha256: 'a'.repeat(64),
        fileRef: 'storage/userA/setupA/v1.sto',
      })
      versionB = await versionRepository.createForSetup(setupB.id, userB.id, {
        versionNo: 1,
        sha256: 'b'.repeat(64),
        fileRef: 'storage/userB/setupB/v1.sto',
      })
    })

    it('should only allow feedback on user\'s own versions', async () => {
      await feedbackRepository.createForUser(userA.id, versionA.id, {
        text: 'Great setup!',
        lapDeltaMs: -500,
      })
      await feedbackRepository.createForUser(userB.id, versionB.id, {
        text: 'Needs work',
        lapDeltaMs: 200,
      })

      const userAFeedback = await feedbackRepository.findByVersionForUser(versionA.id, userA.id)
      const userBFeedback = await feedbackRepository.findByVersionForUser(versionB.id, userB.id)

      expect(userAFeedback).toHaveLength(1)
      expect(userAFeedback[0].text).toBe('Great setup!')
      expect(userBFeedback).toHaveLength(1)
      expect(userBFeedback[0].text).toBe('Needs work')
    })

    it('should reject accessing feedback on another user\'s version', async () => {
      await feedbackRepository.createForUser(userA.id, versionA.id, {
        text: 'Great setup!',
      })

      // User A can access feedback on their version
      const userAFeedback = await feedbackRepository.findByVersionForUser(versionA.id, userA.id)
      expect(userAFeedback).toHaveLength(1)

      // User B cannot access feedback on user A's version
      const userBFeedback = await feedbackRepository.findByVersionForUser(versionA.id, userB.id)
      expect(userBFeedback).toHaveLength(0)
    })

    it('should reject updating feedback for another user', async () => {
      const feedback = await feedbackRepository.createForUser(userA.id, versionA.id, {
        text: 'Original',
      })

      // User A can update their own feedback
      await expect(feedbackRepository.updateForUser(feedback.id, userA.id, { text: 'Updated' })).resolves.toBeDefined()

      // User B cannot update user A's feedback
      await expect(feedbackRepository.updateForUser(feedback.id, userB.id, { text: 'Hacked' })).rejects.toThrow()
    })

    it('should reject deleting feedback for another user', async () => {
      const feedback = await feedbackRepository.createForUser(userA.id, versionA.id, {
        text: 'To delete',
      })

      // User A can delete their own feedback
      await expect(feedbackRepository.deleteForUser(feedback.id, userA.id)).resolves.toBe(true)

      // Recreate for user B test
      const feedback2 = await feedbackRepository.createForUser(userA.id, versionA.id, {
        text: 'To delete 2',
      })

      // User B cannot delete user A's feedback
      await expect(feedbackRepository.deleteForUser(feedback2.id, userB.id)).rejects.toThrow()
    })
  })

  describe('TagRepository', () => {
    let setupA: Setup
    let setupB: Setup

    beforeEach(async () => {
      setupA = await setupRepository.createForUser(userA.id, {
        carId: car.id,
        trackId: track.id,
        condition: 'dry',
      })
      setupB = await setupRepository.createForUser(userB.id, {
        carId: car.id,
        trackId: track.id,
        condition: 'wet',
      })
    })

    it('should only return tags owned by the user', async () => {
      await tagRepository.createForUser(userA.id, 'tag-a')
      await tagRepository.createForUser(userB.id, 'tag-b')

      const userATags = await tagRepository.findByUser(userA.id)
      const userBTags = await tagRepository.findByUser(userB.id)

      expect(userATags).toHaveLength(1)
      expect(userATags[0].name).toBe('tag-a')
      expect(userBTags).toHaveLength(1)
      expect(userBTags[0].name).toBe('tag-b')
    })

    it('should only allow tagging user\'s own setups', async () => {
      const tagA = await tagRepository.createForUser(userA.id, 'tag-a')
      const tagB = await tagRepository.createForUser(userB.id, 'tag-b')

      // User A can tag their own setup
      await expect(tagRepository.addTagToSetup(setupA.id, userA.id, tagA.id)).resolves.toBeDefined()

      // User B can tag their own setup
      await expect(tagRepository.addTagToSetup(setupB.id, userB.id, tagB.id)).resolves.toBeDefined()

      // User A cannot tag user B's setup
      await expect(tagRepository.addTagToSetup(setupB.id, userA.id, tagA.id)).rejects.toThrow()

      // User B cannot tag user A's setup
      await expect(tagRepository.addTagToSetup(setupA.id, userB.id, tagB.id)).rejects.toThrow()
    })

    it('should reject removing tag from another user\'s setup', async () => {
      const tagA = await tagRepository.createForUser(userA.id, 'tag-a')
      await tagRepository.addTagToSetup(setupA.id, userA.id, tagA.id)

      // User A can remove tag from their own setup
      await expect(tagRepository.removeTagFromSetup(setupA.id, userA.id, tagA.id)).resolves.toBe(true)

      // Recreate for user B test
      const tagA2 = await tagRepository.createForUser(userA.id, 'tag-a2')
      await tagRepository.addTagToSetup(setupA.id, userA.id, tagA2.id)

      // User B cannot remove tag from user A's setup
      await expect(tagRepository.removeTagFromSetup(setupA.id, userB.id, tagA2.id)).rejects.toThrow()
    })
  })
})