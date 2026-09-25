import { Module, Global } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ThrottlerModule } from '@nestjs/throttler'
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
import { ResendEmailSender } from './resend-email-sender'
import { EMAIL_SENDER_TOKEN, EmailSender } from './email-sender.interface'
import { ConfigService } from '../config/config.service'

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Session, ResetToken]),
    ThrottlerModule.forRoot([
      { name: 'auth', ttl: 60_000, limit: 10 },
    ]),
  ],
  providers: [
    AuthService,
    AuthGuard,
    UserRepository,
    SessionRepository,
    ResetTokenRepository,
    {
      provide: EMAIL_SENDER_TOKEN,
      useFactory: (config: ConfigService): EmailSender => {
        const apiKey = config.get('RESEND_API_KEY')
        const from = config.get('EMAIL_FROM')
        const frontendUrl = config.get('FRONTEND_URL')
        if (apiKey && from) {
          return new ResendEmailSender(apiKey, from, frontendUrl)
        }
        return new NoopEmailSender()
      },
      inject: [ConfigService],
    },
  ],
  controllers: [AuthController],
  exports: [AuthService, AuthGuard, EMAIL_SENDER_TOKEN],
})
export class AuthModule {}