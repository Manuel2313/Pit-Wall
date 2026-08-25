import { Inject, Injectable, ConflictException, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '../config/config.service'
import { UserRepository } from '../repositories/user.repository'
import { SessionRepository } from '../repositories/session.repository'
import { ResetTokenRepository } from '../repositories/reset-token.repository'
import { EMAIL_SENDER_TOKEN, EmailSender } from './email-sender.interface'
import { User } from '../database/entities/user.entity'
import { randomBytes, createHash } from 'crypto'
import { argon2id, hash, verify } from '@node-rs/argon2'

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly resetTokenRepository: ResetTokenRepository,
    @Inject(EMAIL_SENDER_TOKEN) private readonly emailSender: EmailSender,
  ) {}

  private generateToken(): string {
    return randomBytes(32).toString('hex')
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }

  private async hashPassword(password: string): Promise<string> {
    return hash(password, { algorithm: argon2id })
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return verify(hash, password)
  }

  async register(email: string, password: string): Promise<{ id: string; email: string }> {
    const existingUser = await this.userRepository.findByEmail(email)
    if (existingUser) {
      throw new ConflictException('Email already registered')
    }

    const passwordHash = await this.hashPassword(password)
    const user = await this.userRepository.create(email, passwordHash)
    return { id: user.id, email: user.email }
  }

  async login(email: string, password: string): Promise<string> {
    const user = await this.userRepository.findByEmail(email)
    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const isValid = await this.verifyPassword(password, user.passwordHash)
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const token = this.generateToken()
    const tokenHash = this.hashToken(token)
    const ttlDays = this.configService.get('SESSION_TTL_DAYS')
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000)

    await this.sessionRepository.create(user.id, tokenHash, expiresAt)

    return token
  }

  async logout(token: string): Promise<void> {
    const tokenHash = this.hashToken(token)
    await this.sessionRepository.deleteByTokenHash(tokenHash)
  }

  async validateSession(token: string): Promise<User> {
    const tokenHash = this.hashToken(token)
    const session = await this.sessionRepository.findValidByTokenHash(tokenHash)
    if (!session) {
      throw new UnauthorizedException('Invalid or expired session')
    }
    return session.user
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email)
    if (!user) {
      // Always return success to prevent email enumeration
      return
    }

    const token = this.generateToken()
    const tokenHash = this.hashToken(token)
    const ttlHours = this.configService.get('RESET_TOKEN_TTL_HOURS')
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000)

    await this.resetTokenRepository.create(user.id, tokenHash, expiresAt)
    await this.emailSender.sendResetEmail(email, token)
  }

  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    const tokenHash = this.hashToken(token)
    const resetToken = await this.resetTokenRepository.findValidByTokenHash(tokenHash)

    if (!resetToken) {
      throw new UnauthorizedException('Invalid or expired reset token')
    }

    const user = await this.userRepository.findById(resetToken.userId)
    if (!user) {
      throw new UnauthorizedException('Invalid or expired reset token')
    }

    const passwordHash = await this.hashPassword(newPassword)
    await this.userRepository.updatePassword(user.id, passwordHash)

    await this.resetTokenRepository.markUsed(resetToken.id)
    await this.sessionRepository.deleteByUserId(user.id)
  }
}