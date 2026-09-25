import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm'
import { Setup } from './setup.entity'
import type { CarCategory } from '@pit-wall/api-contracts'

@Entity('cars')
@Index(['category'])
export class Car {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', unique: true })
  name: string

  @Column({ type: 'varchar' })
  category: CarCategory

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date

  @OneToMany(() => Setup, (setup) => setup.car)
  setups: Setup[]
}