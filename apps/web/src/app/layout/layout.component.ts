import { Component, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { Router, RouterLink, RouterOutlet } from '@angular/router'
import { AuthService } from '../auth/auth.service'

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet],
  template: `
    <div class="min-h-screen bg-gray-50">
      <header class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center h-16">
            <nav class="flex items-center space-x-8">
              <h1 class="text-xl font-bold text-gray-900">Pit Wall</h1>
              <div class="hidden md:flex items-center space-x-6">
                <a routerLink="/import" routerLinkActive="text-indigo-600" class="text-sm font-medium text-gray-700 hover:text-indigo-600">Import</a>
                <a routerLink="/library" routerLinkActive="text-indigo-600" class="text-sm font-medium text-gray-700 hover:text-indigo-600">Library</a>
              </div>
            </nav>
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
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <router-outlet />
      </main>
    </div>
  `,
})
export class LayoutComponent {
  auth = inject(AuthService)
  router = inject(Router)

  logout(): void {
    this.auth.logout().subscribe(() => this.router.navigate(['/login']))
  }
}