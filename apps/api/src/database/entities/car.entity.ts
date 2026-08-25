import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm'
import { Setup } from './setup.entity'

@Entity('cars')
@Index(['category'])
export class Car {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar' })
  name: string

  @Column({ type: 'varchar' })
  category: string

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date

  @OneToMany(() => Setup, (setup) => setup.car)
  setups: Setup[]
}