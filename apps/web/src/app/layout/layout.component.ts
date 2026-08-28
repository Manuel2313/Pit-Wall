import { Component, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterOutlet } from '@angular/router'
import { AuthService } from '../auth/auth.service'

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="min-h-screen bg-gray-50">
      <header class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center h-16">
            <div class="flex items-center">
              <h1 class="text-xl font-bold text-gray-900">Pit Wall</h1>
            </div>
            <div class="flex items-center space-x-4">
              <span class="text-sm text-gray-700">{{ auth.user()?.email }}</span>
              <button
                (click)="logout()"
                class="text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>
      <main>
        <router-outlet />
      </main>
    </div>
  `,
})
export class LayoutComponent {
  auth = inject(AuthService)

  logout(): void {
    this.auth.logout().subscribe()
  }
}