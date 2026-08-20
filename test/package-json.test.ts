import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

describe('Root package.json structure', () => {
  const pkgPath = resolve(process.cwd(), 'package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))

  it('should have workspaces for apps/* and packages/*', () => {
    expect(pkg.workspaces).toContain('apps/*')
    expect(pkg.workspaces).toContain('packages/*')
  })

  it('should have test:api script', () => {
    expect(pkg.scripts).toHaveProperty('test:api')
  })

  it('should have test:web script', () => {
    expect(pkg.scripts).toHaveProperty('test:web')
  })

  it('should have test:e2e script', () => {
    expect(pkg.scripts).toHaveProperty('test:e2e')
  })

  it('should have build:web script', () => {
    expect(pkg.scripts).toHaveProperty('build:web')
  })
})