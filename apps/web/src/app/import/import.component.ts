import { Component, signal, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormBuilder, ReactiveFormsModule, Validators, FormArray, FormGroup } from '@angular/forms'
import { Router } from '@angular/router'
import { ImportService } from './import.service'
import type { ImportPreviewResponse, ImportConfirmRequest, ImportConfirmResponse, CarSetupOverlay } from '@pit-wall/api-contracts'

type Step = 'upload' | 'preview' | 'manual-entry'

@Component({
  selector: 'app-import',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Import Setup</h1>
        <p class="mt-2 text-gray-600">Upload a .sto file to import your iRacing setup</p>
      </div>

      @if (step() === 'upload') {
        <div class="bg-white shadow rounded-lg p-6">
          <div class="space-y-6">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">.sto File (required)</label>
              <input
                type="file"
                accept=".sto"
                (change)="onStoFileChange($event)"
                class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                required
              />
              @if (stoFile()) {
                <p class="mt-1 text-sm text-green-600">Selected: {{ stoFile()!.name }}</p>
              }
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Garage HTML Export (optional)</label>
              <p class="text-sm text-gray-500 mb-1">Attach the official iRacing garage HTML export to auto-extract typed values</p>
              <input
                type="file"
                accept=".htm,.html"
                (change)="onHtmlFileChange($event)"
                class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
              />
              @if (htmlFile()) {
                <p class="mt-1 text-sm text-green-600">Selected: {{ htmlFile()!.name }}</p>
              }
            </div>

            @if (error()) {
              <div class="rounded-md bg-red-50 p-4 text-sm text-red-600" role="alert">
                {{ error() }}
              </div>
            }

            <button
              type="button"
              (click)="onUpload()"
              [disabled]="!stoFile() || isLoading()"
              class="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              @if (isLoading()) {
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing...
              } @else {
                Analyze Setup
              }
            </button>
          </div>
        </div>
      }

      @else if (step() === 'preview') {
        @if (preview(); as p) {
          <div class="bg-white shadow rounded-lg p-6">
            <div class="space-y-6">
              <div class="border-b border-gray-200 pb-6">
                <h2 class="text-xl font-semibold text-gray-900 mb-4">Setup Preview</h2>
                <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <dt class="text-sm font-medium text-gray-500">Car</dt>
                    <dd class="mt-1 text-sm text-gray-900">{{ p.metadata.car }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500">Track</dt>
                    <dd class="mt-1 text-sm text-gray-900">{{ p.metadata.track }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500">Category</dt>
                    <dd class="mt-1 text-sm text-gray-900">{{ p.metadata.category }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500">SHA-256</dt>
                    <dd class="mt-1 text-sm text-gray-900 font-mono">{{ p.sha256 }}</dd>
                  </div>
                </dl>
                @if (p.metadata.notes) {
                  <div class="mt-4">
                    <dt class="text-sm font-medium text-gray-500">Notes</dt>
                    <dd class="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{{ p.metadata.notes }}</dd>
                  </div>
                }
              </div>

              @if (p.htmlOverlay) {
                <div class="border-b border-gray-200 pb-6">
                  <h3 class="text-lg font-medium text-gray-900 mb-3 flex items-center">
                    Typed Values (from HTML Export)
                    <span class="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">Auto-extracted</span>
                  </h3>
                  <div class="text-sm text-gray-700">
                    <pre class="bg-gray-50 p-4 rounded overflow-auto max-h-64">{{ formatOverlay(p.htmlOverlay) }}</pre>
                  </div>
                </div>
              } @else {
                <div class="border-b border-gray-200 pb-6">
                  <h3 class="text-lg font-medium text-gray-900 mb-3 flex items-center">
                    Typed Values
                    <span class="ml-2 px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Not available</span>
                  </h3>
                  <p class="text-sm text-gray-600">No garage HTML export was attached. You can enter typed values manually.</p>
                </div>
              }

              <div class="flex justify-end space-x-3">
                <button
                  type="button"
                  (click)="onCancel()"
                  class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                @if (!p.htmlOverlay) {
                  <button
                    type="button"
                    (click)="onEditManual()"
                    class="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Enter Typed Values Manually
                  </button>
                }
                <button
                  type="button"
                  (click)="onConfirm()"
                  [disabled]="isLoading()"
                  class="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  @if (isLoading()) {
                    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  } @else {
                    Confirm & Save
                  }
                </button>
              </div>
            </div>
          </div>
        }
      }

      @else if (step() === 'manual-entry') {
        <div class="bg-white shadow rounded-lg p-6">
          <div class="mb-6">
            <h2 class="text-xl font-semibold text-gray-900">Manual Typed Values Entry</h2>
            <p class="text-sm text-gray-600 mt-1">Enter setup values by category. Add as many categories and parameters as needed.</p>
          </div>

          <form [formGroup]="manualForm" class="space-y-6">
            <div formArrayName="categories">
              @for (category of categoriesArray.controls; track $index; let i = $index) {
                <div class="border border-gray-200 rounded-lg p-4 space-y-4">
                  <div class="flex items-center justify-between">
                    <label class="block text-sm font-medium text-gray-700">Category Name</label>
                    <button
                      type="button"
                      (click)="removeCategory(i)"
                      [disabled]="categoriesArray.length === 1"
                      class="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    [formControlName]="i"
                    placeholder="e.g., Tires, Suspension, Aero"
                    class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />

                  <div class="space-y-2">
                    <div class="flex items-center justify-between">
                      <h4 class="text-sm font-medium text-gray-700">Parameters</h4>
                      <button
                        type="button"
                        (click)="addParameter(i)"
                        class="text-sm text-indigo-600 hover:text-indigo-800"
                      >
                        Add Parameter
                      </button>
                    </div>
                    <div formArrayName="params">
                      @for (param of getParamsArray(i).controls; track $index; let j = $index) {
                        <div class="flex gap-2">
                          <input
                            type="text"
                            [formControlName]="j"
                            placeholder="Parameter name (e.g., Pressure, Camber)"
                            class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                          <input
                            type="text"
                            [formControlName]="j"
                            placeholder="Value"
                            class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                          <button
                            type="button"
                            (click)="removeParameter(i, j)"
                            class="text-red-600 hover:text-red-800 p-2"
                          >
                            ✕
                          </button>
                        </div>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>

            <button
              type="button"
              (click)="addCategory()"
              class="w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              + Add Category
            </button>

            @if (error()) {
              <div class="rounded-md bg-red-50 p-4 text-sm text-red-600" role="alert">
                {{ error() }}
              </div>
            }

            <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                (click)="onBackToPreview()"
                class="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Back to Preview
              </button>
              <button
                type="button"
                (click)="onConfirm()"
                [disabled]="isLoading() || manualForm.invalid"
                class="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                @if (isLoading()) {
                  <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                } @else {
                  Confirm & Save
                }
              </button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
})
export class ImportComponent {
  private importService = inject(ImportService)
  private router = inject(Router)
  private fb = inject(FormBuilder)

  step = signal<Step>('upload')
  stoFile = signal<File | null>(null)
  htmlFile = signal<File | null>(null)
  preview = signal<ImportPreviewResponse | null>(null)
  manualOverlay = signal<CarSetupOverlay | null>(null)
  isLoading = signal(false)
  error = signal<string | null>(null)

  manualForm = this.fb.group({
    categories: this.fb.array<FormGroup>([this.createCategoryGroup()]),
  })

  get categoriesArray(): FormArray {
    return this.manualForm.get('categories') as FormArray
  }

  private createCategoryGroup(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      params: this.fb.array<FormGroup>([this.createParamGroup()]),
    })
  }

  private createParamGroup(): FormGroup {
    return this.fb.group({
      name: ['', Validators.required],
      value: ['', Validators.required],
    })
  }

  getParamsArray(categoryIndex: number): FormArray {
    return this.categoriesArray.at(categoryIndex).get('params') as FormArray
  }

  addCategory(): void {
    this.categoriesArray.push(this.createCategoryGroup())
  }

  removeCategory(index: number): void {
    if (this.categoriesArray.length > 1) {
      this.categoriesArray.removeAt(index)
    }
  }

  addParameter(categoryIndex: number): void {
    this.getParamsArray(categoryIndex).push(this.createParamGroup())
  }

  removeParameter(categoryIndex: number, paramIndex: number): void {
    const params = this.getParamsArray(categoryIndex)
    if (params.length > 1) {
      params.removeAt(paramIndex)
    }
  }

  onStoFileChange(event: Event): void {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0] ?? null
    if (file) {
      this.stoFile.set(file)
      this.error.set(null)
    }
  }

  onHtmlFileChange(event: Event): void {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0] ?? null
    if (file) {
      this.htmlFile.set(file)
    }
  }

  onManualOverlayChange(overlay: CarSetupOverlay): void {
    this.manualOverlay.set(overlay)
  }

  onUpload(): void {
    const file = this.stoFile()
    const html = this.htmlFile()
    if (!file) return

    this.isLoading.set(true)
    this.error.set(null)

    this.importService.preview(file, html || undefined).subscribe({
      next: (preview) => {
        this.preview.set(preview)
        this.step.set('preview')
        this.isLoading.set(false)
      },
      error: (err) => {
        this.isLoading.set(false)
        if (err.status === 400) {
          this.error.set(err.error?.message || 'Invalid or corrupt .sto file')
        } else if (err.status === 401) {
          this.error.set('Session expired. Please log in again.')
        } else {
          this.error.set('Failed to analyze setup. Please try again.')
        }
      },
    })
  }

  onPreview(): void {
    this.step.set('preview')
  }

  onEditManual(): void {
    this.step.set('manual-entry')
    this.buildManualFormFromPreview()
  }

  onBackToPreview(): void {
    this.step.set('preview')
  }

  onCancel(): void {
    this.resetAll()
  }

  onConfirm(): void {
    const file = this.stoFile()
    const p = this.preview()
    if (!file || !p) return

    this.isLoading.set(true)
    this.error.set(null)

    const dto: ImportConfirmRequest = {
      metadata: {
        car: p.metadata.car,
        track: p.metadata.track,
        category: p.metadata.category,
        notes: p.metadata.notes,
      },
      htmlOverlay: p.htmlOverlay,
      manualOverlay: this.step() === 'manual-entry' ? this.manualOverlay() || undefined : undefined,
    }

    this.importService.confirm(file, dto, this.htmlFile() || undefined).subscribe({
      next: (response: ImportConfirmResponse) => {
        this.isLoading.set(false)
        this.router.navigate(['/library', response.setupId])
      },
      error: (err) => {
        this.isLoading.set(false)
        if (err.status === 400) {
          this.error.set(err.error?.message || 'SHA-256 mismatch or invalid data')
        } else if (err.status === 401) {
          this.error.set('Session expired. Please log in again.')
        } else if (err.status === 404) {
          this.error.set(err.error?.message || 'Car or track not found in catalog')
        } else {
          this.error.set('Failed to save setup. Please try again.')
        }
      },
    })
  }

  private buildManualFormFromPreview(): void {
    this.manualForm.reset()
    this.categoriesArray.clear()
    this.categoriesArray.push(this.createCategoryGroup())
    this.manualOverlay.set(null)
  }

  private resetAll(): void {
    this.step.set('upload')
    this.stoFile.set(null)
    this.htmlFile.set(null)
    this.preview.set(null)
    this.manualOverlay.set(null)
    this.isLoading.set(false)
    this.error.set(null)
    this.manualForm.reset()
    this.categoriesArray.clear()
    this.categoriesArray.push(this.createCategoryGroup())
  }

  formatOverlay(overlay: CarSetupOverlay): string {
    return JSON.stringify(overlay, null, 2)
  }
}