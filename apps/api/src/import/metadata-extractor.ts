import { Car } from '../database/entities/car.entity'
import type { StoMetadata } from '@pit-wall/api-contracts'

export function extractMetadata(notesText: string, catalogCars: Car[]): StoMetadata {
  const normalizedNotes = notesText.toLowerCase()

  // Find matching car from catalog (case-insensitive partial match)
  let matchedCar: Car | undefined
  for (const car of catalogCars) {
    if (normalizedNotes.includes(car.name.toLowerCase())) {
      matchedCar = car
      break
    }
  }

  // If no car matched, use a fallback
  const carName = matchedCar?.name ?? 'Unknown Car'

  // Determine category from car name
  let category: string
  if (carName.toLowerCase().includes('porsche cup') || carName.toLowerCase().includes('cup 992')) {
    category = 'Porsche Cup'
  } else if (carName.toLowerCase().includes('gt3')) {
    category = 'GT3'
  } else {
    category = 'Unknown'
  }

  // Extract track from notes (simple approach: look for known track patterns)
  // For now, we'll use a fallback and can improve later
  const trackName = extractTrackFromNotes(notesText)

  return {
    car: carName,
    track: trackName,
    category,
    notes: notesText,
  }
}

function extractTrackFromNotes(notesText: string): string {
  // Try to find track name in notes - this is a simplified approach
  // Real .sto files may have track info in various formats
  const knownTracks = [
    'Spa-Francorchamps',
    'Monza',
    'Nürburgring',
    'Laguna Seca',
    'Barcelona-Catalunya',
    'Watkins Glen',
    'Zandvoort',
    'Road Atlanta',
    'Sebring',
    'Road America',
  ]

  for (const track of knownTracks) {
    if (notesText.toLowerCase().includes(track.toLowerCase())) {
      return track
    }
  }

  // Fallback: try to extract from common patterns
  const lines = notesText.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.toLowerCase().startsWith('track:')) {
      return trimmed.slice(6).trim()
    }
    if (trimmed.toLowerCase().startsWith('circuit:')) {
      return trimmed.slice(8).trim()
    }
  }

  return 'Unknown Track'
}