export const EMAIL_SENDER_TOKEN = 'EmailSender'

export interface EmailSender {
  sendResetEmail(email: string, resetToken: string): Promise<void>
}