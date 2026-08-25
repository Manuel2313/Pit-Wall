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

@Entity('reset_tokens')
@Index(['tokenHash'], { unique: true })
@Index(['userId'])
@Index(['expiresAt'])
export class ResetToken {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar' })
  tokenHash: string

  @Column({ type: 'uuid' })
  userId: string

  @ManyToOne(() => User, (user) => user.resetTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User

  @Column({ type: 'timestamptz' })
  expiresAt: Date

  @Column({ type: 'boolean', default: false })
  used: boolean

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}