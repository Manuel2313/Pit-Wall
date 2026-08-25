import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm'
import { Setup } from './setup.entity'

@Entity('tracks')
@Index(['name'])
export class Track {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar' })
  name: string

  @Column({ type: 'varchar' })
  layout: string

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date

  @OneToMany(() => Setup, (setup) => setup.track)
  setups: Setup[]
}