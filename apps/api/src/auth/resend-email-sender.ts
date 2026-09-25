import { Logger } from '@nestjs/common'
import { EmailSender } from './email-sender.interface'

export class ResendEmailSender implements EmailSender {
  private readonly logger = new Logger(ResendEmailSender.name)

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly frontendUrl: string,
  ) {}

  async sendResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset?token=${resetToken}`
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: email,
        subject: 'Pit Wall — Password reset',
        html: `<p>Use the link below to reset your password. It will expire soon.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      this.logger.error(`Resend send failed (${res.status}): ${body}`)
      throw new Error(`Failed to send password reset email`)
    }
  }
}
