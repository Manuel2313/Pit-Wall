import { Injectable } from '@nestjs/common'
import { EmailSender } from './email-sender.interface'

@Injectable()
export class NoopEmailSender implements EmailSender {
  lastEmail?: { email: string; token: string }

  async sendResetEmail(email: string, resetToken: string): Promise<void> {
    this.lastEmail = { email, token: resetToken }
  }
}