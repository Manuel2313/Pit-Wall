import { DataSource } from 'typeorm'
import { Car } from '../database/entities/car.entity'
import { Track } from '../database/entities/track.entity'

export async function seedCatalog(dataSource: DataSource): Promise<void> {
  const carRepo = dataSource.getRepository(Car)
  const trackRepo = dataSource.getRepository(Track)

  // Check if already seeded
  if (await carRepo.count() > 0) return

  // Insert 4 cars
  await carRepo.save([
    { name: 'Ferrari 296 GT3', category: 'GT3' },
    { name: 'Mustang GT3', category: 'GT3' },
    { name: 'Mercedes-AMG GT3', category: 'GT3' },
    { name: 'Porsche 911 GT3 Cup 992', category: 'Porsche Cup' },
  ])

  // Insert tracks (at least 5 with layouts)
  await trackRepo.save([
    { name: 'Spa-Francorchamps', layout: 'Grand Prix' },
    { name: 'Monza', layout: 'Grand Prix' },
    { name: 'Nürburgring', layout: 'Grand Prix' },
    { name: 'Laguna Seca', layout: 'Full' },
    { name: 'Barcelona-Catalunya', layout: 'Grand Prix' },
    { name: 'Watkins Glen', layout: 'Full' },
    { name: 'Zandvoort', layout: 'Grand Prix' },
    { name: 'Road Atlanta', layout: 'Full' },
    { name: 'Sebring', layout: 'Full' },
    { name: 'Road America', layout: 'Full' },
  ])
}