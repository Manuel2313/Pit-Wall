import { test, expect } from '@playwright/test'
import { parseSto } from '@pit-wall/sto-parser'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURES_DIR = join(__dirname, '../IRacingSetups')

test('sto-parser import smoke', () => {
  // This test verifies that the sto-parser package can be imported and used
  // in a test environment. It's a basic smoke test for the parser.
  const bytes = readFileSync(join(FIXTURES_DIR, 'lemans_FerrariGT3_Claude_V1.sto'))
  const uint8 = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const result = parseSto(uint8)
  expect(result).toBeDefined()
  expect(result.ok).toBe(true)
  if (result.ok) {
    expect(result.document.notes.text.length).toBeGreaterThan(0)
  }
})