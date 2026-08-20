import { describe, it, expect } from 'vitest'

describe('Web app scaffold smoke test', () => {
  it('should have basic math working', () => {
    expect(1 + 1).toBe(2)
  })

  it('should have TypeScript types working', () => {
    const message: string = 'Hello, Pit Wall!'
    expect(message).toContain('Pit Wall')
  })
})