import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm'
import { SetupTag } from './setup-tag.entity'

@Entity('tags')
@Index(['name', 'userId'], { unique: true })
export class Tag {
  @PrimaryColumn('uuid')
  id: string

  @Column({ type: 'varchar' })
  name: string

  @Column({ type: 'uuid' })
  userId: string

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date

  @OneToMany(() => SetupTag, (setupTag) => setupTag.tag)
  setupTags: SetupTag[]
}