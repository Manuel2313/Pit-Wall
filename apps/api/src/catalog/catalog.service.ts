import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Car } from '../database/entities/car.entity'
import { Track } from '../database/entities/track.entity'
import { carResponseSchema } from './dto/car.dto'
import { trackResponseSchema } from './dto/track.dto'

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Car)
    private readonly carRepository: Repository<Car>,
    @InjectRepository(Track)
    private readonly trackRepository: Repository<Track>,
  ) {}

  async getCars(): Promise<z.infer<typeof carResponseSchema>[]> {
    const cars = await this.carRepository.find({ order: { name: 'ASC' } })
    return cars.map((car) => ({
      id: car.id,
      name: car.name,
      category: car.category,
      createdAt: car.createdAt.toISOString(),
    }))
  }

  async getTracks(): Promise<z.infer<typeof trackResponseSchema>[]> {
    const tracks = await this.trackRepository.find({ order: { name: 'ASC' } })
    return tracks.map((track) => ({
      id: track.id,
      name: track.name,
      layout: track.layout,
      createdAt: track.createdAt.toISOString(),
    }))
  }
}