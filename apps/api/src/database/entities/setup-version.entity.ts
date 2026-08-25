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
import { Setup } from './setup.entity'

@Entity('setup_versions')
@Unique(['setupId', 'versionNo'])
@Index(['setupId'])
@Index(['versionNo'])
export class SetupVersion {
  @PrimaryColumn('uuid')
  id: string

  @Column({ type: 'uuid' })
  setupId: string

  @ManyToOne(() => Setup, (setup) => setup.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'setupId' })
  setup: Setup

  @Column({ type: 'int' })
  versionNo: number

  @Column({ type: 'int', nullable: true })
  parentVersionNo: number | null

  @Column({ type: 'varchar', length: 64 })
  sha256: string

  @Column({ type: 'jsonb', nullable: true })
  overlay: Record<string, Record<string, string>> | null

  @Column({ type: 'varchar', length: 500 })
  fileRef: string

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}