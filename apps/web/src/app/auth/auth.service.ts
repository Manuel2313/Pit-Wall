import { HttpClient } from '@angular/common/http'
import { Injectable, signal, computed } from '@angular/core'
import { Observable, tap, catchError, of, map } from 'rxjs'
import type { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse, MeResponse } from '@pit-wall/api-contracts'

export interface User {
  userId: string
  email: string
}

const TOKEN_STORAGE_KEY = 'pit-wall.sessionToken'

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = '/api'
  private userSignal = signal<User | null>(null)
  readonly user = this.userSignal.asReadonly()
  readonly isAuthenticated = computed(() => this.userSignal() !== null)

  constructor(private http: HttpClient) {}

  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY)
    } catch {
      return null
    }
  }

  private setToken(token: string): void {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token)
    } catch {
      // ignore
    }
  }

  private clearToken(): void {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
    } catch {
      // ignore
    }
  }

  login(email: string, password: string): Observable<User> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/login`, { email, password } satisfies LoginRequest)
      .pipe(
        tap((res) => this.setToken(res.sessionToken)),
        map((res) => ({ userId: res.userId, email: res.email })),
        tap((user) => this.userSignal.set(user))
      )
  }

  register(email: string, password: string): Observable<User> {
    return this.http
      .post<RegisterResponse>(`${this.apiUrl}/auth/register`, { email, password } satisfies RegisterRequest)
      .pipe(
        map((res) => ({ userId: res.userId, email: res.email })),
        tap((user) => this.userSignal.set(user))
      )
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(`${this.apiUrl}/auth/logout`, {})
      .pipe(tap(() => {
        this.clearToken()
        this.userSignal.set(null)
      }))
  }

  restoreSession(): Observable<User | null> {
    if (!this.getToken()) {
      this.userSignal.set(null)
      return of(null)
    }
    return this.http
      .get<MeResponse>(`${this.apiUrl}/auth/me`)
      .pipe(
        map((res) => ({ userId: res.userId, email: res.email })),
        tap((user) => this.userSignal.set(user)),
        catchError(() => {
          this.clearToken()
          this.userSignal.set(null)
          return of(null)
        })
      )
  }
}