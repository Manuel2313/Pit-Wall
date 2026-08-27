import { Controller, Put, Delete, Get, Param, Body, Request, UseGuards, HttpCode, HttpStatus } from '@nestjs/common'
import { AuthGuard } from '../auth/auth.guard'
import { TagsService } from './tags.service'
import { ZodValidationPipe } from '../pipes/zod-validation.pipe'
import { updateTagsRequestSchema, tagsResponseSchema } from '@pit-wall/api-contracts'
import type { UpdateTagsRequest, TagsResponse } from '@pit-wall/api-contracts'

interface RequestWithUser extends Request {
  user: { id: string; email: string }
}

@Controller('setups')
@UseGuards(AuthGuard)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Put(':id/tags')
  async updateTags(
    @Param('id') setupId: string,
    @Body(new ZodValidationPipe(updateTagsRequestSchema)) body: UpdateTagsRequest,
    @Request() req: RequestWithUser,
  ): Promise<TagsResponse> {
    return this.tagsService.updateTags(setupId, req.user.id, body.tags)
  }

  @Delete(':id/tags')
  @HttpCode(HttpStatus.OK)
  async deleteTags(
    @Param('id') setupId: string,
    @Body(new ZodValidationPipe(updateTagsRequestSchema)) body: UpdateTagsRequest,
    @Request() req: RequestWithUser,
  ): Promise<TagsResponse> {
    // Delete all specified tags from the setup
    for (const tagName of body.tags) {
      try {
        await this.tagsService.deleteTag(setupId, req.user.id, tagName)
      } catch (error) {
        // If tag not found or not linked, continue with others
        if (error instanceof NotFoundException) {
          continue
        }
        throw error
      }
    }
    // Return remaining tags
    return this.tagsService.getTags(setupId, req.user.id)
  }

  @Get(':id/tags')
  async getTags(
    @Param('id') setupId: string,
    @Request() req: RequestWithUser,
  ): Promise<TagsResponse> {
    return this.tagsService.getTags(setupId, req.user.id)
  }
}