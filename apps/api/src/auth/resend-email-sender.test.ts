import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ResendEmailSender } from './resend-email-sender'

describe('ResendEmailSender', () => {
  const apiKey = 'test-api-key'
  const from = 'noreply@pitwall.local'
  const frontendUrl = 'https://pitwall.local'
  let sender: ResendEmailSender
  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    sender = new ResendEmailSender(apiKey, from, frontendUrl)
    fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('sendResetEmail', () => {
    it('posts to Resend API with bearer auth and json content type', async () => {
      fetchSpy.mockResolvedValue({ ok: true, status: 200 })

      await sender.sendResetEmail('user@example.com', 'tok-123')

      expect(fetchSpy).toHaveBeenCalledOnce()
      const [url, init] = fetchSpy.mock.calls[0]
      expect(url).toBe('https://api.resend.com/emails')
      expect(init.method).toBe('POST')
      expect(init.headers.Authorization).toBe(`Bearer ${apiKey}`)
      expect(init.headers['Content-Type']).toBe('application/json')
    })

    it('builds the payload with the sender, recipient and reset link', async () => {
      fetchSpy.mockResolvedValue({ ok: true, status: 200 })

      await sender.sendResetEmail('user@example.com', 'tok-123')

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
      expect(body.from).toBe(from)
      expect(body.to).toEqual(['user@example.com'])
      expect(body.subject).toBe('Pit Wall — Password reset')
      expect(body.html).toContain(`${frontendUrl}/reset?token=tok-123`)
    })

    it('includes a plain-text alternative so non-HTML clients can read the email', async () => {
      fetchSpy.mockResolvedValue({ ok: true, status: 200 })

      await sender.sendResetEmail('user@example.com', 'tok-123')

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
      expect(body.text).toBeDefined()
      expect(body.text).toContain(`${frontendUrl}/reset?token=tok-123`)
    })

    it('passes an idempotency key derived from the reset token so retries dedupe', async () => {
      fetchSpy.mockResolvedValue({ ok: true, status: 200 })

      await sender.sendResetEmail('user@example.com', 'tok-123')
      await sender.sendResetEmail('user@example.com', 'tok-123')

      const key1 = fetchSpy.mock.calls[0][1].headers['Idempotency-Key']
      const key2 = fetchSpy.mock.calls[1][1].headers['Idempotency-Key']
      expect(key1).toBeDefined()
      expect(key1).toBe(key2)
    })

    it('uses a different idempotency key for a different reset token', async () => {
      fetchSpy.mockResolvedValue({ ok: true, status: 200 })

      await sender.sendResetEmail('user@example.com', 'tok-A')
      await sender.sendResetEmail('user@example.com', 'tok-B')

      const keyA = fetchSpy.mock.calls[0][1].headers['Idempotency-Key']
      const keyB = fetchSpy.mock.calls[1][1].headers['Idempotency-Key']
      expect(keyA).not.toBe(keyB)
    })

    it('throws a generic error when Resend responds non-OK (does not leak remote body)', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 422,
        text: async () => '{"message":"invalid from address"}',
      })

      await expect(sender.sendResetEmail('user@example.com', 'tok-123')).rejects.toThrow(
        'Failed to send password reset email',
      )
    })

    it('propagates a network failure', async () => {
      fetchSpy.mockRejectedValue(new Error('ECONNRESET'))

      await expect(sender.sendResetEmail('user@example.com', 'tok-123')).rejects.toThrow('ECONNRESET')
    })
  })
})
