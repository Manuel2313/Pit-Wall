import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { FeedbackEntry } from '../database/entities/feedback-entry.entity'
import { SetupVersion } from '../database/entities/setup-version.entity'
import { Setup } from '../database/entities/setup.entity'
import { FeedbackService } from './feedback.service'
import { FeedbackController } from './feedback.controller'
import { FeedbackRepository } from '../repositories/feedback.repository'
import { SetupVersionRepository } from '../repositories/setup-version.repository'
import { SetupRepository } from '../repositories/setup.repository'

@Module({
  imports: [TypeOrmModule.forFeature([FeedbackEntry, SetupVersion, Setup])],
  providers: [FeedbackService, FeedbackRepository, SetupVersionRepository, SetupRepository],
  controllers: [FeedbackController],
  exports: [FeedbackService],
})
export class FeedbackModule {}