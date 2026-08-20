import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

describe('apps/web scaffold structure', () => {
  const webRoot = resolve(process.cwd(), 'apps/web')

  it('should exist as a directory', () => {
    expect(existsSync(webRoot)).toBe(true)
  })

  it('should have package.json', () => {
    expect(existsSync(resolve(webRoot, 'package.json'))).toBe(true)
  })

  it('should have angular.json', () => {
    expect(existsSync(resolve(webRoot, 'angular.json'))).toBe(true)
  })

  it('should have tsconfig.json with strict mode', () => {
    const tsconfigPath = resolve(webRoot, 'tsconfig.json')
    expect(existsSync(tsconfigPath)).toBe(true)
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'))
    expect(tsconfig.compilerOptions?.strict).toBe(true)
  })

  it('should have vitest.config.ts', () => {
    expect(existsSync(resolve(webRoot, 'vitest.config.ts'))).toBe(true)
  })

  it('should have tailwind.config.ts (Tailwind 4)', () => {
    expect(existsSync(resolve(webRoot, 'tailwind.config.ts'))).toBe(true)
  })

  it('should have src/main.ts (standalone bootstrap)', () => {
    expect(existsSync(resolve(webRoot, 'src/main.ts'))).toBe(true)
  })

  it('should have src/app/app.config.ts (standalone config)', () => {
    expect(existsSync(resolve(webRoot, 'src/app/app.config.ts'))).toBe(true)
  })
})