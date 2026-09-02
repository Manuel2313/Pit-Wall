import { Component, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { ActivatedRoute } from '@angular/router'

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Setup Library</h1>
        <p class="mt-2 text-gray-600">Your imported setups will appear here</p>
      </div>

      <div class="bg-white shadow rounded-lg p-6">
        <div class="text-center py-12">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">No setups yet</h3>
          <p class="mt-1 text-sm text-gray-500">Import your first setup to get started</p>
          <div class="mt-6">
            <a routerLink="/import" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
              Import Setup
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LibraryComponent {
  private route = inject(ActivatedRoute)
  setupId = this.route.snapshot.paramMap.get('id')
}