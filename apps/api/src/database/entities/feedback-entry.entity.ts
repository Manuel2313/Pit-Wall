import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm'
import { User } from './user.entity'
import { Setup } from './setup.entity'
import { SetupVersion } from './setup-version.entity'

@Entity('feedback_entries')
@Index(['userId'])
@Index(['setupId'])
@Index(['versionId'])
export class FeedbackEntry {
  @PrimaryColumn('uuid')
  id: string

  @Column({ type: 'uuid' })
  userId: string

  @ManyToOne(() => User, (user) => user.feedbackEntries, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User

  @Column({ type: 'uuid' })
  setupId: string

  @ManyToOne(() => Setup, (setup) => setup.feedbackEntries, { onDelete: 'CASCADE' })
  @JoinColumn()
  setup: Setup

  @Column({ type: 'uuid' })
  versionId: string

  @ManyToOne(() => SetupVersion, { onDelete: 'CASCADE' })
  @JoinColumn()
  version: SetupVersion

  @Column({ type: 'text' })
  text: string

  @Column({ type: 'int', nullable: true })
  lapDeltaMs: number | null

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}