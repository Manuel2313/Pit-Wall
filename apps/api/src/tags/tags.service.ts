import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { TagRepository } from '../repositories/tag.repository'
import type { TagsResponse, UpdateTagsRequest } from '@pit-wall/api-contracts'

@Injectable()
export class TagsService {
  constructor(private readonly tagRepository: TagRepository) {}

  async updateTags(setupId: string, userId: string, tagNames: string[]): Promise<TagsResponse> {
    if (!Array.isArray(tagNames)) {
      throw new BadRequestException('Tags must be an array')
    }

    // Deduplicate tag names (case-sensitive per user)
    const uniqueTagNames = [...new Set(tagNames)]

    // Upsert tags for this user
    const tagIds: string[] = []
    for (const name of uniqueTagNames) {
      if (!name || name.trim().length === 0) {
        continue // Skip empty tag names
      }
      const tag = await this.tagRepository.findOrCreateForUser(userId, name.trim())
      tagIds.push(tag.id)
    }

    // Link tags to setup
    for (const tagId of tagIds) {
      await this.tagRepository.addTagToSetup(setupId, userId, tagId)
    }

    // Return all tags for this setup (after upsert)
    const tags = await this.tagRepository.getTagsForSetup(setupId, userId)

    return { tags: tags.map((t) => t.name) }
  }

  async getTags(setupId: string, userId: string): Promise<TagsResponse> {
    const tags = await this.tagRepository.getTagsForSetup(setupId, userId)
    return { tags: tags.map((t) => t.name) }
  }

  async deleteTag(setupId: string, userId: string, tagName: string): Promise<TagsResponse> {
    if (!tagName || tagName.trim().length === 0) {
      throw new BadRequestException('Tag name is required')
    }

    // Find tag by name for this user
    const tag = await this.tagRepository.findByNameForUser(userId, tagName.trim())
    if (!tag) {
      throw new NotFoundException('Tag not found')
    }

    // Remove tag from setup
    const removed = await this.tagRepository.removeTagFromSetup(setupId, userId, tag.id)
    if (!removed) {
      throw new NotFoundException('Tag not linked to this setup')
    }

    // Return remaining tags
    const tags = await this.tagRepository.getTagsForSetup(setupId, userId)
    return { tags: tags.map((t) => t.name) }
  }
}