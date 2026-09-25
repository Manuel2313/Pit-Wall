import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Setup } from '../database/entities/setup.entity'
import { SetupVersion } from '../database/entities/setup-version.entity'
import type { SetupListItem, SetupDetail, SetupListQuery } from '@pit-wall/api-contracts'

@Injectable()
export class SetupsService {
  constructor(
    @InjectRepository(Setup) private readonly setupRepo: Repository<Setup>,
    @InjectRepository(SetupVersion) private readonly versionRepo: Repository<SetupVersion>,
  ) {}

  async listForUser(userId: string, filters: SetupListQuery): Promise<SetupListItem[]> {
    const qb = this.setupRepo
      .createQueryBuilder('setup')
      .leftJoinAndSelect('setup.car', 'car')
      .leftJoinAndSelect('setup.track', 'track')
      .loadRelationCountAndMap('setup.versionCount', 'setup.versions')
      .where('setup.userId = :userId', { userId })

    if (filters.car) {
      qb.andWhere('car.name = :carName', { carName: filters.car })
    }
    if (filters.track) {
      qb.andWhere('track.name = :trackName', { trackName: filters.track })
    }
    if (filters.condition) {
      qb.andWhere('setup.condition = :condition', { condition: filters.condition })
    }

    qb.orderBy('setup.createdAt', 'DESC')

    const setups = await qb.getMany()

    return setups.map((s) => ({
      id: s.id,
      car: s.car?.name ?? '',
      track: s.track?.name ?? '',
      condition: s.condition,
      createdAt: s.createdAt.toISOString(),
      versionCount: (s as Setup & { versionCount?: number }).versionCount ?? 0,
    }))
  }

  async getByIdForUser(setupId: string, userId: string): Promise<SetupDetail> {
    const setup = await this.setupRepo
      .createQueryBuilder('setup')
      .leftJoinAndSelect('setup.car', 'car')
      .leftJoinAndSelect('setup.track', 'track')
      .leftJoinAndSelect('setup.versions', 'version')
      .where('setup.id = :setupId', { setupId })
      .andWhere('setup.userId = :userId', { userId })
      .orderBy('version.versionNo', 'ASC')
      .getOne()

    if (!setup) {
      throw new NotFoundException('Setup not found')
    }

    return {
      id: setup.id,
      car: setup.car?.name ?? '',
      track: setup.track?.name ?? '',
      condition: setup.condition,
      createdAt: setup.createdAt.toISOString(),
      versions: (setup.versions ?? []).map((v) => ({
        id: v.id,
        versionNo: v.versionNo,
        parentVersionNo: v.parentVersionNo,
        sha256: v.sha256,
        createdAt: v.createdAt.toISOString(),
        hasOverlay: v.overlay !== null,
      })),
    }
  }
}
