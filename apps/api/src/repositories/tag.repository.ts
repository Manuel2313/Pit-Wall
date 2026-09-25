import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Tag } from '../database/entities/tag.entity'
import { SetupTag } from '../database/entities/setup-tag.entity'
import { SetupRepository } from './setup.repository'
import { randomUUID } from 'crypto'

@Injectable()
export class TagRepository {
  constructor(
    @InjectRepository(Tag) private readonly tagRepo: Repository<Tag>,
    @InjectRepository(SetupTag) private readonly setupTagRepo: Repository<SetupTag>,
    private readonly setupRepository: SetupRepository,
  ) {}

  async createForUser(userId: string, name: string): Promise<Tag> {
    const tag = this.tagRepo.create({ id: randomUUID(), name, userId })
    return this.tagRepo.save(tag)
  }

  async findByUser(userId: string): Promise<Tag[]> {
    return this.tagRepo.find({
      where: { userId },
      order: { name: 'ASC' },
    })
  }

  async findByIdForUser(tagId: string, userId: string): Promise<Tag | null> {
    return this.tagRepo.findOne({
      where: { id: tagId, userId },
    })
  }

  async findByNameForUser(userId: string, name: string): Promise<Tag | null> {
    return this.tagRepo.findOne({
      where: { userId, name },
    })
  }

  async findOrCreateForUser(userId: string, name: string): Promise<Tag> {
    const existing = await this.findByNameForUser(userId, name)
    if (existing) {
      return existing
    }
    return this.createForUser(userId, name)
  }

  async addTagToSetup(setupId: string, userId: string, tagId: string): Promise<SetupTag> {
    // Verify setup belongs to user
    const setup = await this.setupRepository.findByIdForUser(setupId, userId)
    if (!setup) {
      throw new Error('Setup not found or access denied')
    }

    // Verify tag belongs to user
    const tag = await this.findByIdForUser(tagId, userId)
    if (!tag) {
      throw new Error('Tag not found or access denied')
    }

    // Check if already tagged
    const existing = await this.setupTagRepo.findOne({
      where: { setupId, tagId },
    })
    if (existing) {
      return existing
    }

    const setupTag = this.setupTagRepo.create({
      id: randomUUID(),
      setupId,
      tagId,
      userId,
    })
    return this.setupTagRepo.save(setupTag)
  }

  async removeTagFromSetup(setupId: string, userId: string, tagId: string): Promise<boolean> {
    // Verify setup belongs to user
    const setup = await this.setupRepository.findByIdForUser(setupId, userId)
    if (!setup) {
      throw new Error('Setup not found or access denied')
    }

    // Verify tag belongs to user
    const tag = await this.findByIdForUser(tagId, userId)
    if (!tag) {
      throw new Error('Tag not found or access denied')
    }

    const result = await this.setupTagRepo.delete({ setupId, tagId })
    return result.affected === 1
  }

  async getTagsForSetup(setupId: string, userId: string): Promise<Tag[]> {
    const setup = await this.setupRepository.findByIdForUser(setupId, userId)
    if (!setup) {
      return []
    }

    const setupTags = await this.setupTagRepo.find({
      where: { setupId },
      relations: ['tag'],
    })
    return setupTags.map((st) => st.tag)
  }
}