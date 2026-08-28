import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TestBed } from '@angular/core/testing'
import { Router } from '@angular/router'
import { AuthService } from './auth.service'
import { authGuard } from './auth.guard'
import { of, throwError } from 'rxjs'

describe('authGuard', () => {
  let authService: AuthService
  let router: Router

  const mockUser = { userId: 'user-123', email: 'test@example.com' }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        {
          provide: Router,
          useValue: { navigate: vi.fn() },
        },
      ],
    })
    authService = TestBed.inject(AuthService)
    router = TestBed.inject(Router)
  })

  it('should allow access when user is authenticated', () => {
    authService['userSignal'].set(mockUser)

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/dashboard' } as any)
    )

    expect(result).toBe(true)
  })

  it('should restore session and allow access when session is valid', (done) => {
    vi.spyOn(authService, 'restoreSession').mockReturnValue(of(mockUser))

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/dashboard' } as any)
    )

    result.subscribe((allowed) => {
      expect(allowed).toBe(true)
      expect(authService.restoreSession).toHaveBeenCalled()
      done()
    })
  })

  it('should redirect to login when restore session fails', (done) => {
    vi.spyOn(authService, 'restoreSession').mockReturnValue(throwError(() => new Error('Unauthorized')))

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/dashboard' } as any)
    )

    result.subscribe((allowed) => {
      expect(allowed).toBe(false)
      expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { redirect: '/dashboard' } })
      done()
    })
  })

  it('should redirect to login with redirect parameter', (done) => {
    vi.spyOn(authService, 'restoreSession').mockReturnValue(throwError(() => new Error('Unauthorized')))

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as any, { url: '/settings' } as any)
    )

    result.subscribe((allowed) => {
      expect(allowed).toBe(false)
      expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { redirect: '/settings' } })
      done()
    })
  })
})