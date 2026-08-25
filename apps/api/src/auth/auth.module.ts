import { Module, Global } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from '../database/entities/user.entity'
import { Session } from '../database/entities/session.entity'
import { ResetToken } from '../database/entities/reset-token.entity'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { AuthGuard } from './auth.guard'
import { UserRepository } from '../repositories/user.repository'
import { SessionRepository } from '../repositories/session.repository'
import { ResetTokenRepository } from '../repositories/reset-token.repository'
import { NoopEmailSender } from './noop-email-sender'
import { EMAIL_SENDER_TOKEN, EmailSender } from './email-sender.interface'

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User, Session, ResetToken])],
  providers: [
    AuthService,
    AuthGuard,
    UserRepository,
    SessionRepository,
    ResetTokenRepository,
    { provide: EMAIL_SENDER_TOKEN, useClass: NoopEmailSender },
  ],
  controllers: [AuthController],
  exports: [AuthService, AuthGuard, EMAIL_SENDER_TOKEN],
})
export class AuthModule {}