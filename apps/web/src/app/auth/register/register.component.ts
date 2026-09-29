import { Component, signal, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
import { AuthService, AccountCreatedError } from '../auth.service'

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-8">
        <div>
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Create your account</h2>
          <p class="mt-2 text-center text-sm text-gray-600">
            Already have an account? <a routerLink="/login" class="font-medium text-indigo-600 hover:text-indigo-500">Sign in</a>
          </p>
        </div>
        
        <form class="mt-8 space-y-6" [formGroup]="registerForm" (ngSubmit)="onSubmit()">
          @if (error()) {
            <div class="rounded-md bg-red-50 p-4 text-sm text-red-600" role="alert">
              {{ error() }}
            </div>
          }

          <div class="rounded-md shadow-sm -space-y-px">
            <div>
              <label for="email" class="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autocomplete="email"
                required
                formControlName="email"
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
              @if (emailField.invalid && (emailField.dirty || emailField.touched)) {
                <p class="mt-1 text-sm text-red-600">Please enter a valid email address</p>
              }
            </div>
            <div>
              <label for="password" class="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autocomplete="new-password"
                required
                formControlName="password"
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password (min 8 characters)"
              />
              @if (passwordField.invalid && (passwordField.dirty || passwordField.touched)) {
                <p class="mt-1 text-sm text-red-600">Password must be at least 8 characters</p>
              }
            </div>
            <div>
              <label for="confirmPassword" class="sr-only">Confirm password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autocomplete="new-password"
                required
                formControlName="confirmPassword"
                class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Confirm password"
              />
              @if (confirmPasswordField.invalid && (confirmPasswordField.dirty || confirmPasswordField.touched)) {
                <p class="mt-1 text-sm text-red-600">Please confirm your password</p>
              }
              @if (registerForm.hasError('passwordMismatch') && confirmPasswordField.touched) {
                <p class="mt-1 text-sm text-red-600">Passwords do not match</p>
              }
            </div>
          </div>

          <div>
            <button
              type="submit"
              [disabled]="registerForm.invalid || isLoading()"
              class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              @if (isLoading()) {
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating account...
              } @else {
                Create account
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private fb = inject(FormBuilder)
  private auth = inject(AuthService)
  private router = inject(Router)

  isLoading = signal(false)
  error = signal<string | null>(null)

  registerForm = this.fb.nonNullable.group(
    {
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: this.passwordMatchValidator }
  )

  private passwordMatchValidator(form: any) {
    const password = form.get('password')
    const confirmPassword = form.get('confirmPassword')
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true })
      return { passwordMismatch: true }
    }
    return null
  }

  get emailField() {
    return this.registerForm.controls.email
  }

  get passwordField() {
    return this.registerForm.controls.password
  }

  get confirmPasswordField() {
    return this.registerForm.controls.confirmPassword
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched()
      return
    }

    this.isLoading.set(true)
    this.error.set(null)

    const { email, password } = this.registerForm.getRawValue()

    this.auth.register(email, password).subscribe({
      next: () => {
        this.isLoading.set(false)
        this.router.navigate(['/'])
      },
      error: (err) => {
        this.isLoading.set(false)
        if (err instanceof AccountCreatedError) {
          this.error.set('Account created. Please sign in manually.')
        } else if (err.status === 409) {
          this.error.set('An account with this email already exists.')
        } else {
          this.error.set(err.error?.message || 'Registration failed. Please try again.')
        }
      },
    })
  }
}