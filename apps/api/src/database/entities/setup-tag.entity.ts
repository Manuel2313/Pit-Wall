import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm'
import { User } from './user.entity'
import { Setup } from './setup.entity'
import { Tag } from './tag.entity'

@Entity('setup_tags')
@Unique(['setupId', 'tagId'])
@Index(['setupId'])
@Index(['tagId'])
@Index(['userId'])
export class SetupTag {
  @PrimaryColumn('uuid')
  id: string

  @Column({ type: 'uuid' })
  setupId: string

  @ManyToOne(() => Setup, (setup) => setup.setupTags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'setupId' })
  setup: Setup

  @Column({ type: 'uuid' })
  tagId: string

  @ManyToOne(() => Tag, (tag) => tag.setupTags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tagId' })
  tag: Tag

  @Column({ type: 'uuid' })
  userId: string

  @ManyToOne(() => User, (user) => user.setupTags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}