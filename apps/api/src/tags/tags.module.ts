import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Tag } from '../database/entities/tag.entity'
import { SetupTag } from '../database/entities/setup-tag.entity'
import { Setup } from '../database/entities/setup.entity'
import { TagsService } from './tags.service'
import { TagsController } from './tags.controller'
import { TagRepository } from '../repositories/tag.repository'
import { SetupRepository } from '../repositories/setup.repository'

@Module({
  imports: [TypeOrmModule.forFeature([Tag, SetupTag, Setup])],
  providers: [TagsService, TagRepository, SetupRepository],
  controllers: [TagsController],
  exports: [TagsService],
})
export class TagsModule {}