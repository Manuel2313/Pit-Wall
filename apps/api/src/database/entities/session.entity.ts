import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm'
import { User } from './user.entity'

@Entity('sessions')
@Index(['tokenHash'], { unique: true })
@Index(['userId'])
@Index(['expiresAt'])
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar' })
  tokenHash: string

  @Column({ type: 'uuid' })
  userId: string

  @ManyToOne(() => User, (user) => user.sessions, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User

  @Column({ type: 'timestamptz' })
  expiresAt: Date

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}