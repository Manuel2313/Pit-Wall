import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { createHash } from 'node:crypto'
import { parseSto, parseFerrariSetupHtml } from '@pit-wall/sto-parser'
import { Car } from '../database/entities/car.entity'
import { Track } from '../database/entities/track.entity'
import { StorageAdapter } from '../storage/storage-adapter.interface'
import { extractMetadata } from './metadata-extractor'
import type { ImportPreviewResponse, StoMetadata } from '@pit-wall/api-contracts'

@Injectable()
export class ImportService {
  constructor(
    private readonly storageAdapter: StorageAdapter,
    @InjectRepository(Car)
    private readonly carRepository: Repository<Car>,
    @InjectRepository(Track)
    private readonly trackRepository: Repository<Track>,
  ) {}

  async preview(file: Express.Multer.File, htmlFile?: Express.Multer.File): Promise<ImportPreviewResponse> {
    // 1. Compute SHA-256 of file.buffer
    const sha256 = createHash('sha256').update(file.buffer).digest('hex')

    // 2. Parse with parseSto(file.buffer)
    const parseResult = parseSto(new Uint8Array(file.buffer))

    // 3. If !ok → throw BadRequestException('Corrupt or unsupported .sto file')
    if (!parseResult.ok) {
      throw new BadRequestException('Corrupt or unsupported .sto file')
    }

    // 4. Extract metadata from notes.text
    const catalogCars = await this.carRepository.find()
    const metadata = extractMetadata(parseResult.document.notes.text, catalogCars)

    // 5. If htmlFile → parse with parseFerrariSetupHtml (returns overlay or null)
    let htmlOverlay: ImportPreviewResponse['htmlOverlay']
    if (htmlFile) {
      const htmlContent = htmlFile.buffer.toString('utf-8')
      const overlay = parseFerrariSetupHtml(htmlContent)
      if (overlay) {
        // Convert CarSetup to the expected CarSetupOverlay format
        htmlOverlay = {
          categories: overlay.categories,
        }
      }
    }

    // 6. Return { metadata, sha256, htmlOverlay }
    return {
      metadata,
      sha256,
      htmlOverlay,
    }
  }
}