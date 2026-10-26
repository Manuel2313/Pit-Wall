import { Logger } from '@nestjs/common'
import { createHash } from 'node:crypto'
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
    const idempotencyKey = `password-reset/${createHash('sha256').update(resetToken).digest('hex').slice(0, 32)}`

    const html = `<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827;">
    <h2 style="color: #4f46e5;">Pit Wall</h2>
    <p>We received a request to reset your password.</p>
    <p><a href="${resetUrl}" style="display: inline-block; padding: 10px 16px; background: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 6px;">Reset your password</a></p>
    <p>Or copy this URL into your browser: <br><code>${resetUrl}</code></p>
    <p style="color: #6b7280; font-size: 13px;">This link expires soon. If you didn't request a reset, you can safely ignore this email.</p>
  </body>
</html>`

    const text = `Pit Wall — Password reset

We received a request to reset your password. Open this URL in your browser:

${resetUrl}

This link expires soon. If you didn't request a reset, you can safely ignore this email.`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        from: this.from,
        to: [email],
        subject: 'Pit Wall — Password reset',
        html,
        text,
      }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      this.logger.error(`Resend send failed (${res.status}): ${body}`)
      throw new Error(`Failed to send password reset email`)
    }
  }
}
