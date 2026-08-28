import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ReactiveFormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { RegisterComponent } from './register.component'
import { AuthService } from '../auth.service'
import { of, throwError } from 'rxjs'

describe('RegisterComponent', () => {
  let component: RegisterComponent
  let fixture: ComponentFixture<RegisterComponent>
  let authService: AuthService
  let router: Router

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterComponent, ReactiveFormsModule],
      providers: [
        {
          provide: AuthService,
          useValue: { register: vi.fn() },
        },
        {
          provide: Router,
          useValue: { navigate: vi.fn() },
        },
      ],
    }).compileComponents()

    fixture = TestBed.createComponent(RegisterComponent)
    component = fixture.componentInstance
    authService = TestBed.inject(AuthService)
    router = TestBed.inject(Router)
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  it('should have invalid form initially', () => {
    expect(component.registerForm.invalid).toBe(true)
  })

  it('should validate email field', () => {
    const emailControl = component.registerForm.controls.email
    emailControl.setValue('invalid-email')
    expect(emailControl.invalid).toBe(true)
    emailControl.setValue('valid@example.com')
    expect(emailControl.valid).toBe(true)
  })

  it('should validate password minimum length', () => {
    const passwordControl = component.registerForm.controls.password
    passwordControl.setValue('short')
    expect(passwordControl.invalid).toBe(true)
    passwordControl.setValue('password123')
    expect(passwordControl.valid).toBe(true)
  })

  it('should validate password confirmation match', () => {
    component.registerForm.setValue({
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'different',
    })
    expect(component.registerForm.hasError('passwordMismatch')).toBe(true)

    component.registerForm.setValue({
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    })
    expect(component.registerForm.hasError('passwordMismatch')).toBe(false)
  })

  it('should call authService.register and navigate on success', () => {
    vi.spyOn(authService, 'register').mockReturnValue(of({ userId: '123', email: 'test@example.com' }))

    component.registerForm.setValue({
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    })
    component.onSubmit()

    expect(component.isLoading()).toBe(true)
    expect(authService.register).toHaveBeenCalledWith('test@example.com', 'password123')
    expect(router.navigate).toHaveBeenCalledWith(['/'])
    expect(component.isLoading()).toBe(false)
  })

  it('should show duplicate email error on 409', () => {
    vi.spyOn(authService, 'register').mockReturnValue(
      throwError(() => ({ status: 409, error: { message: 'Email already exists' } }))
    )

    component.registerForm.setValue({
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    })
    component.onSubmit()

    expect(component.error()).toBe('An account with this email already exists.')
    expect(component.isLoading()).toBe(false)
    expect(router.navigate).not.toHaveBeenCalled()
  })

  it('should show generic error on other registration failure', () => {
    vi.spyOn(authService, 'register').mockReturnValue(
      throwError(() => ({ status: 500, error: { message: 'Server error' } }))
    )

    component.registerForm.setValue({
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    })
    component.onSubmit()

    expect(component.error()).toBe('Registration failed. Please try again.')
  })

  it('should not submit when form is invalid', () => {
    component.onSubmit()
    expect(authService.register).not.toHaveBeenCalled()
  })

  it('should disable submit button when loading', () => {
    component.isLoading.set(true)
    fixture.detectChanges()

    const button = fixture.nativeElement.querySelector('button[type="submit"]')
    expect(button.disabled).toBe(true)
  })
})