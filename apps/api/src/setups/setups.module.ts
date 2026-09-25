import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Setup } from '../database/entities/setup.entity'
import { SetupVersion } from '../database/entities/setup-version.entity'
import { SetupsService } from './setups.service'
import { SetupsController } from './setups.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Setup, SetupVersion])],
  providers: [SetupsService],
  controllers: [SetupsController],
})
export class SetupsModule {}
