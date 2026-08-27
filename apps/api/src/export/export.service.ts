import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { SetupVersionRepository } from '../repositories/setup-version.repository'
import { StorageAdapter } from '../storage/storage-adapter.interface'
import { FileNotFound } from '../storage/file-not-found.error'
import type { ExportResponse } from '@pit-wall/api-contracts'
import { createHash } from 'node:crypto'

interface ExportFileResult {
  buffer: Buffer
  sha256: string
  filename: string
}

@Injectable()
export class ExportService {
  constructor(
    private readonly versionRepository: SetupVersionRepository,
    private readonly storageAdapter: StorageAdapter,
  ) {}

  async exportFile(versionId: string, userId: string): Promise<ExportFileResult> {
    const version = await this.versionRepository.findByIdForUser(versionId, userId)

    if (!version) {
      throw new NotFoundException('Version not found or access denied')
    }

    // Check if version has a file_ref (imported version) vs manual-only
    if (!version.fileRef || version.fileRef.trim() === '') {
      throw new BadRequestException('Manual-only version has no export')
    }

    let buffer: Buffer
    try {
      buffer = await this.storageAdapter.get(version.fileRef)
    } catch (error) {
      if (error instanceof FileNotFound) {
        throw new NotFoundException('File not found in storage')
      }
      throw error
    }

    const sha256 = createHash('sha256').update(buffer).digest('hex')
    const filename = `setup_v${version.versionNo}.sto`

    return { buffer, sha256, filename }
  }
}