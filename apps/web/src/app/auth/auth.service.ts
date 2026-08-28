import { HttpClient } from '@angular/common/http'
import { Injectable, signal, computed } from '@angular/core'
import { Observable, tap, catchError, of, map } from 'rxjs'
import type { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse, MeResponse } from '@pit-wall/api-contracts'

export interface User {
  userId: string
  email: string
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = '/api'
  private userSignal = signal<User | null>(null)
  readonly user = this.userSignal.asReadonly()
  readonly isAuthenticated = computed(() => this.userSignal() !== null)

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<User> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/login`, { email, password } satisfies LoginRequest, { withCredentials: true })
      .pipe(
        map((res) => ({ userId: res.sessionToken, email })),
        tap((user) => this.userSignal.set(user))
      )
  }

  register(email: string, password: string): Observable<User> {
    return this.http
      .post<RegisterResponse>(`${this.apiUrl}/auth/register`, { email, password } satisfies RegisterRequest, { withCredentials: true })
      .pipe(
        map((res) => ({ userId: res.userId, email: res.email })),
        tap((user) => this.userSignal.set(user))
      )
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(`${this.apiUrl}/auth/logout`, {}, { withCredentials: true })
      .pipe(tap(() => this.userSignal.set(null)))
  }

  restoreSession(): Observable<User> {
    return this.http
      .get<MeResponse>(`${this.apiUrl}/auth/me`, { withCredentials: true })
      .pipe(
        map((res) => ({ userId: res.userId, email: res.email })),
        tap((user) => this.userSignal.set(user)),
        catchError(() => {
          this.userSignal.set(null)
          return of(null as unknown as User)
        })
      )
  }
}