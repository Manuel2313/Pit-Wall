import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { SetupVersionRepository } from '../repositories/setup-version.repository'
import { StorageAdapter } from '../storage/storage-adapter.interface'
import type { VersionSummary, TypedDiffResponse, ByteDiffResponse, CarSetupOverlay } from '@pit-wall/api-contracts'

interface TypedDiffField {
  field: string
  oldValue: string
  newValue: string
}

interface ByteDiffRegion {
  offset: number
  length: number
  oldBytes: string
  newBytes: string
}

@Injectable()
export class VersionsService {
  constructor(
    private readonly versionRepository: SetupVersionRepository,
    private readonly storageAdapter: StorageAdapter,
  ) {}

  async listVersions(setupId: string, userId: string): Promise<VersionSummary[]> {
    const versions = await this.versionRepository.findBySetupForUser(setupId, userId)
    // Order by version_no descending (newest first)
    const sorted = [...versions].sort((a, b) => b.versionNo - a.versionNo)

    return sorted.map((v) => ({
      id: v.id,
      versionNo: v.versionNo,
      parentVersionNo: v.parentVersionNo,
      sha256: v.sha256,
      createdAt: v.createdAt.toISOString(),
      hasOverlay: v.overlay !== null,
    }))
  }

  async diff(fromVid: string, toVid: string, userId: string): Promise<TypedDiffResponse | ByteDiffResponse> {
    // Load both versions and verify user owns the setup
    const [fromVersion, toVersion] = await Promise.all([
      this.versionRepository.findByIdForUser(fromVid, userId),
      this.versionRepository.findByIdForUser(toVid, userId),
    ])

    if (!fromVersion || !toVersion) {
      throw new NotFoundException('One or both versions not found or access denied')
    }

    // Verify both versions belong to the same setup
    if (fromVersion.setupId !== toVersion.setupId) {
      throw new BadRequestException('Versions must belong to the same setup')
    }

    // Verify fromVersion < toVersion (by versionNo)
    if (fromVersion.versionNo >= toVersion.versionNo) {
      throw new BadRequestException('fromVersion must be less than toVersion')
    }

    // Both have overlays -> typed diff
    if (fromVersion.overlay && toVersion.overlay) {
      const changedFields = this.typedDiff(fromVersion.overlay, toVersion.overlay)
      return { changedFields }
    }

    // Otherwise -> byte diff via StorageAdapter
    const [fromBytes, toBytes] = await Promise.all([
      this.storageAdapter.get(fromVersion.fileRef),
      this.storageAdapter.get(toVersion.fileRef),
    ])

    const regions = this.byteDiff(fromBytes, toBytes)
    return { regions }
  }

  private typedDiff(oldOverlay: CarSetupOverlay, newOverlay: CarSetupOverlay): TypedDiffField[] {
    const fields: TypedDiffField[] = []
    const oldCategories = oldOverlay.categories ?? {}
    const newCategories = newOverlay.categories ?? {}

    const allCategoryKeys = new Set([...Object.keys(oldCategories), ...Object.keys(newCategories)])

    for (const cat of allCategoryKeys) {
      const oldCat = oldCategories[cat] ?? {}
      const newCat = newCategories[cat] ?? {}

      const allKeys = new Set([...Object.keys(oldCat), ...Object.keys(newCat)])

      for (const key of allKeys) {
        const oldValue = oldCat[key] ?? ''
        const newValue = newCat[key] ?? ''

        if (oldValue !== newValue) {
          fields.push({
            field: `${cat}.${key}`,
            oldValue,
            newValue,
          })
        }
      }
    }

    return fields
  }

  private byteDiff(oldBytes: Buffer, newBytes: Buffer): ByteDiffRegion[] {
    const regions: ByteDiffRegion[] = []
    const maxLen = Math.max(oldBytes.length, newBytes.length)

    let inDiff = false
    let diffStart = 0

    for (let i = 0; i <= maxLen; i++) {
      const oldByte = i < oldBytes.length ? oldBytes[i] : undefined
      const newByte = i < newBytes.length ? newBytes[i] : undefined
      const isDiff = oldByte !== newByte

      if (isDiff && !inDiff) {
        // Start of a new diff region
        inDiff = true
        diffStart = i
      } else if (!isDiff && inDiff) {
        // End of a diff region
        inDiff = false
        const length = i - diffStart
        const oldRegion = oldBytes.subarray(diffStart, i)
        const newRegion = newBytes.subarray(diffStart, i)
        regions.push({
          offset: diffStart,
          length,
          oldBytes: oldRegion.toString('hex'),
          newBytes: newRegion.toString('hex'),
        })
      }
    }

    // Handle case where diff extends to end of longer buffer
    if (inDiff) {
      const length = maxLen - diffStart
      const oldRegion = oldBytes.subarray(diffStart)
      const newRegion = newBytes.subarray(diffStart)
      regions.push({
        offset: diffStart,
        length,
        oldBytes: oldRegion.toString('hex'),
        newBytes: newRegion.toString('hex'),
      })
    }

    return regions
  }
}