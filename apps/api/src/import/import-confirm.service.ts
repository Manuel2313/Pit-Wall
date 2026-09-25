import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { createHash } from 'node:crypto'
import { randomUUID } from 'crypto'
import { SetupRepository } from '../repositories/setup.repository'
import { SetupVersionRepository } from '../repositories/setup-version.repository'
import { Car } from '../database/entities/car.entity'
import { Track } from '../database/entities/track.entity'
import { StorageAdapter } from '../storage/storage-adapter.interface'
import type { ImportConfirmRequest, ImportConfirmResponse } from '@pit-wall/api-contracts'

@Injectable()
export class ImportConfirmService {
  constructor(
    private readonly storageAdapter: StorageAdapter,
    private readonly setupRepository: SetupRepository,
    private readonly versionRepository: SetupVersionRepository,
    @InjectRepository(Car)
    private readonly carRepository: Repository<Car>,
    @InjectRepository(Track)
    private readonly trackRepository: Repository<Track>,
  ) {}

  async confirm(userId: string, dto: ImportConfirmRequest, stoBuffer: Buffer): Promise<ImportConfirmResponse> {
    // 1. Verify sha256 matches
    const computedSha256 = createHash('sha256').update(stoBuffer).digest('hex')
    if (computedSha256 !== dto.sha256) {
      throw new BadRequestException('SHA-256 mismatch: uploaded file does not match preview')
    }

    // 2. Resolve carId from catalog (match metadata.car name)
    const car = await this.findCarByName(dto.metadata.car)
    if (!car) {
      throw new NotFoundException(`Car not found in catalog: ${dto.metadata.car}`)
    }

    // 3. Resolve trackId from catalog (match metadata.track name)
    const track = await this.findTrackByName(dto.metadata.track)
    if (!track) {
      throw new NotFoundException(`Track not found in catalog: ${dto.metadata.track}`)
    }

    // 4. Find or create Setup for user (unique: userId+carId+trackId+condition)
    const condition = dto.metadata.category // Using category as condition per design
    const setup = await this.setupRepository.findOrCreateForUser(userId, car.id, track.id, condition)

    // 5. Determine version number (1 for new setup, next for existing)
    const existingVersions = await this.versionRepository.findBySetupForUser(setup.id, userId)
    const versionNo = existingVersions.length > 0 ? existingVersions.length + 1 : 1
    const parentVersionNo = versionNo > 1 ? versionNo - 1 : null

    // 6. Generate storage key: `storage/${userId}/${setupId}/${versionId}.sto`
    const versionId = randomUUID()
    const storageKey = `storage/${userId}/${setup.id}/${versionId}.sto`

    // 7. Store file via storageAdapter.put(key, stoBuffer)
    await this.storageAdapter.put(storageKey, stoBuffer)

    // 8. Create SetupVersion: version_no=1 (or next), parent=null (or previous), sha256, file_ref=key, overlay
    const overlay = dto.htmlOverlay ?? dto.manualOverlay ?? null
    const version = await this.versionRepository.createVersion(
      setup.id,
      userId,
      versionNo,
      parentVersionNo,
      dto.sha256,
      storageKey,
      overlay,
    )

    // 9. Return { setupId, versionNo: 1, sha256 }
    return {
      setupId: setup.id,
      versionNo: version.versionNo,
      sha256: dto.sha256,
    }
  }

  private async findCarByName(name: string): Promise<Car | null> {
    return this.carRepository.findOne({
      where: { name },
    })
  }

  private async findTrackByName(name: string): Promise<Track | null> {
    return this.trackRepository.findOne({
      where: { name },
    })
  }
}