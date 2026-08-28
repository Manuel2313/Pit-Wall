import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TestBed } from '@angular/core/testing'
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing'
import { AuthService } from './auth.service'
import type { User } from './auth.service'

describe('AuthService', () => {
  let service: AuthService
  let httpMock: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService],
    })
    service = TestBed.inject(AuthService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => {
    httpMock.verify()
  })

  it('should be created', () => {
    expect(service).toBeTruthy()
  })

  it('should return user on successful login', (done) => {
    const mockResponse = { sessionToken: 'token-123' }
    const expectedUser: User = { userId: 'token-123', email: 'test@example.com' }

    service.login('test@example.com', 'password123').subscribe((user) => {
      expect(user).toEqual(expectedUser)
      expect(service.user()).toEqual(expectedUser)
      expect(service.isAuthenticated()).toBe(true)
      done()
    })

    const req = httpMock.expectOne('/api/auth/login')
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual({ email: 'test@example.com', password: 'password123' })
    expect(req.request.withCredentials).toBe(true)
    req.flush(mockResponse)
  })

  it('should return user on successful register', (done) => {
    const mockResponse = { userId: 'user-123', email: 'new@example.com' }
    const expectedUser: User = { userId: 'user-123', email: 'new@example.com' }

    service.register('new@example.com', 'password123').subscribe((user) => {
      expect(user).toEqual(expectedUser)
      expect(service.user()).toEqual(expectedUser)
      expect(service.isAuthenticated()).toBe(true)
      done()
    })

    const req = httpMock.expectOne('/api/auth/register')
    expect(req.request.method).toBe('POST')
    expect(req.request.body).toEqual({ email: 'new@example.com', password: 'password123' })
    expect(req.request.withCredentials).toBe(true)
    req.flush(mockResponse)
  })

  it('should clear user on logout', (done) => {
    // First set a user
    service['userSignal'].set({ userId: 'token-123', email: 'test@example.com' })

    service.logout().subscribe(() => {
      expect(service.user()).toBeNull()
      expect(service.isAuthenticated()).toBe(false)
      done()
    })

    const req = httpMock.expectOne('/api/auth/logout')
    expect(req.request.method).toBe('POST')
    expect(req.request.withCredentials).toBe(true)
    req.flush(null)
  })

  it('should restore session and set user', (done) => {
    const mockResponse = { userId: 'user-123', email: 'restored@example.com' }
    const expectedUser: User = { userId: 'user-123', email: 'restored@example.com' }

    service.restoreSession().subscribe((user) => {
      expect(user).toEqual(expectedUser)
      expect(service.user()).toEqual(expectedUser)
      expect(service.isAuthenticated()).toBe(true)
      done()
    })

    const req = httpMock.expectOne('/api/auth/me')
    expect(req.request.method).toBe('GET')
    expect(req.request.withCredentials).toBe(true)
    req.flush(mockResponse)
  })

  it('should clear user on restore session error', (done) => {
    service['userSignal'].set({ userId: 'token-123', email: 'test@example.com' })

    service.restoreSession().subscribe({
      next: () => {
        // Should not reach here
        expect(true).toBe(false)
      },
      error: () => {
        expect(service.user()).toBeNull()
        expect(service.isAuthenticated()).toBe(false)
        done()
      },
    })

    const req = httpMock.expectOne('/api/auth/me')
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' })
  })
})