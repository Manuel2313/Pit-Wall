import { Controller, Post, Get, Patch, Delete, Param, Body, Request, HttpCode, HttpStatus, UseGuards, Query } from '@nestjs/common'
import { AuthGuard } from '../auth/auth.guard'
import { FeedbackService } from './feedback.service'
import { ZodValidationPipe } from '../pipes/zod-validation.pipe'
import {
  createFeedbackRequestSchema,
  feedbackEntrySchema,
  feedbackListResponseSchema,
} from '@pit-wall/api-contracts'
import type { CreateFeedbackRequest, FeedbackEntry, FeedbackListResponse } from '@pit-wall/api-contracts'

interface RequestWithUser extends Request {
  user: { id: string; email: string }
}

@Controller('versions')
@UseGuards(AuthGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post(':vid/feedback')
  async create(
    @Param('vid') versionId: string,
    @Body(new ZodValidationPipe(createFeedbackRequestSchema)) body: CreateFeedbackRequest,
    @Request() req: RequestWithUser,
  ): Promise<FeedbackEntry> {
    return this.feedbackService.create(versionId, req.user.id, body)
  }

  @Get(':vid/feedback')
  async listByVersion(
    @Param('vid') versionId: string,
    @Request() req: RequestWithUser,
  ): Promise<FeedbackListResponse> {
    return this.feedbackService.list(versionId, req.user.id)
  }

  @Get('setups/:id/feedback')
  async listBySetup(
    @Param('id') setupId: string,
    @Request() req: RequestWithUser,
  ): Promise<FeedbackListResponse> {
    return this.feedbackService.listBySetup(setupId, req.user.id)
  }

  @Patch('feedback/:fid')
  async update(
    @Param('fid') feedbackId: string,
    @Body(new ZodValidationPipe(createFeedbackRequestSchema.partial())) body: Partial<CreateFeedbackRequest>,
    @Request() req: RequestWithUser,
  ): Promise<FeedbackEntry> {
    return this.feedbackService.update(feedbackId, req.user.id, body)
  }

  @Delete('feedback/:fid')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('fid') feedbackId: string,
    @Request() req: RequestWithUser,
  ): Promise<void> {
    await this.feedbackService.delete(feedbackId, req.user.id)
  }
}