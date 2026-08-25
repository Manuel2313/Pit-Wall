import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm'
import { Session } from './session.entity'
import { ResetToken } from './reset-token.entity'
import { Setup } from './setup.entity'
import { FeedbackEntry } from './feedback-entry.entity'
import { SetupTag } from './setup-tag.entity'

@Entity('users')
@Index(['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', unique: true })
  email: string

  @Column({ type: 'varchar' })
  passwordHash: string

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date

  @OneToMany(() => Session, (session) => session.user)
  sessions: Session[]

  @OneToMany(() => ResetToken, (resetToken) => resetToken.user)
  resetTokens: ResetToken[]

  @OneToMany(() => Setup, (setup) => setup.user)
  setups: Setup[]

  @OneToMany(() => FeedbackEntry, (feedback) => feedback.user)
  feedbackEntries: FeedbackEntry[]

  @OneToMany(() => SetupTag, (setupTag) => setupTag.user)
  setupTags: SetupTag[]
}