import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ReactiveFormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { LoginComponent } from './login.component'
import { AuthService } from '../auth.service'
import { of, throwError } from 'rxjs'

describe('LoginComponent', () => {
  let component: LoginComponent
  let fixture: ComponentFixture<LoginComponent>
  let authService: AuthService
  let router: Router

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [
        {
          provide: AuthService,
          useValue: { login: vi.fn() },
        },
        {
          provide: Router,
          useValue: { navigate: vi.fn() },
        },
      ],
    }).compileComponents()

    fixture = TestBed.createComponent(LoginComponent)
    component = fixture.componentInstance
    authService = TestBed.inject(AuthService)
    router = TestBed.inject(Router)
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should have invalid form initially', () => {
    expect(component.loginForm.invalid).toBe(true)
  })

  it('should validate email field', () => {
    const emailControl = component.loginForm.controls.email
    emailControl.setValue('invalid-email')
    expect(emailControl.invalid).toBe(true)
    emailControl.setValue('valid@example.com')
    expect(emailControl.valid).toBe(true)
  })

  it('should validate password field', () => {
    const passwordControl = component.loginForm.controls.password
    passwordControl.setValue('')
    expect(passwordControl.invalid).toBe(true)
    passwordControl.setValue('password123')
    expect(passwordControl.valid).toBe(true)
  })

  it('should call authService.login and navigate on success', () => {
    vi.spyOn(authService, 'login').mockReturnValue(of({ userId: '123', email: 'test@example.com' }))

    component.loginForm.setValue({ email: 'test@example.com', password: 'password123' })
    component.onSubmit()

    expect(component.isLoading()).toBe(true)
    expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password123')
    expect(router.navigate).toHaveBeenCalledWith(['/'])
    expect(component.isLoading()).toBe(false)
  })

  it('should show error on login failure', () => {
    vi.spyOn(authService, 'login').mockReturnValue(
      throwError(() => ({ error: { message: 'Invalid credentials' } }))
    )

    component.loginForm.setValue({ email: 'test@example.com', password: 'wrong' })
    component.onSubmit()

    expect(component.error()).toBe('Invalid credentials')
    expect(component.isLoading()).toBe(false)
    expect(router.navigate).not.toHaveBeenCalled()
  })

  it('should show generic error when no error message from server', () => {
    vi.spyOn(authService, 'login').mockReturnValue(throwError(() => ({})))

    component.loginForm.setValue({ email: 'test@example.com', password: 'wrong' })
    component.onSubmit()

    expect(component.error()).toBe('Invalid email or password. Please try again.')
  })

  it('should not submit when form is invalid', () => {
    component.onSubmit()
    expect(authService.login).not.toHaveBeenCalled()
  })

  it('should disable submit button when loading', () => {
    component.isLoading.set(true)
    fixture.detectChanges()

    const button = fixture.nativeElement.querySelector('button[type="submit"]')
    expect(button.disabled).toBe(true)
  })
})