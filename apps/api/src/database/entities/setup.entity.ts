import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
  Unique,
} from 'typeorm'
import { User } from './user.entity'
import { Car } from './car.entity'
import { Track } from './track.entity'
import { SetupVersion } from './setup-version.entity'
import { FeedbackEntry } from './feedback-entry.entity'
import { SetupTag } from './setup-tag.entity'

@Entity('setups')
@Unique(['userId', 'carId', 'trackId', 'condition'])
@Index(['userId'])
@Index(['carId'])
@Index(['trackId'])
export class Setup {
  @PrimaryColumn('uuid')
  id: string

  @Column({ type: 'uuid' })
  userId: string

  @ManyToOne(() => User, (user) => user.setups, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User

  @Column({ type: 'uuid' })
  carId: string

  @ManyToOne(() => Car, (car) => car.setups)
  @JoinColumn()
  car: Car

  @Column({ type: 'uuid' })
  trackId: string

  @ManyToOne(() => Track, (track) => track.setups)
  @JoinColumn()
  track: Track

  @Column({ type: 'varchar' })
  condition: string

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date

  @OneToMany(() => SetupVersion, (version) => version.setup)
  versions: SetupVersion[]

  @OneToMany(() => FeedbackEntry, (feedback) => feedback.setup)
  feedbackEntries: FeedbackEntry[]

  @OneToMany(() => SetupTag, (setupTag) => setupTag.setup)
  setupTags: SetupTag[]
}