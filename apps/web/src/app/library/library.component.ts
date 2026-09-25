import { Component, signal, inject, computed, OnInit, effect } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router, ActivatedRoute } from '@angular/router'
import { LibraryService } from './library.service'
import { AuthService } from '../auth/auth.service'
import type {
  SetupListItem,
  SetupDetail,
  SetupListQuery,
  VersionSummary,
  TypedDiffResponse,
  ByteDiffResponse,
  FeedbackEntry,
  CreateFeedbackRequest,
} from '@pit-wall/api-contracts'

type ViewMode = 'list' | 'detail' | 'diff'

interface DiffResult {
  type: 'typed' | 'byte'
  data: TypedDiffResponse | ByteDiffResponse
  fromVersion: number
  toVersion: number
}

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Setup Library</h1>
          <p class="mt-1 text-gray-600">Your imported setups</p>
        </div>
        <button
          (click)="goToImport()"
          class="w-full sm:w-auto px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          + Import Setup
        </button>
      </div>

      <!-- Error Toast -->
      @if (error()) {
        <div class="rounded-md bg-red-50 p-4 text-sm text-red-600 flex items-center justify-between" role="alert">
          {{ error() }}
          <button (click)="error.set(null)" class="text-red-600 hover:text-red-800 font-bold">✕</button>
        </div>
      }

      <!-- List View -->
      @if (viewMode() === 'list') {
        <div class="bg-white shadow rounded-lg overflow-hidden">
          <!-- Filters -->
          <div class="p-4 border-b border-gray-200 bg-gray-50">
            <form [formGroup]="filterForm" class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Car</label>
                <select
                  formControlName="car"
                  class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">All Cars</option>
                  @for (car of availableCars(); track car) {
                    <option [value]="car">{{ car }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Track</label>
                <select
                  formControlName="track"
                  class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">All Tracks</option>
                  @for (track of availableTracks(); track track) {
                    <option [value]="track">{{ track }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                <select
                  formControlName="condition"
                  class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">All Conditions</option>
                  @for (cond of availableConditions(); track cond) {
                    <option [value]="cond">{{ cond }}</option>
                  }
                </select>
              </div>
              <div class="flex items-end">
                <button
                  type="button"
                  (click)="clearFilters()"
                  class="w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Clear Filters
                </button>
              </div>
            </form>
          </div>

          <!-- Setup List -->
          @if (isLoading()) {
            <div class="p-8 text-center">
              <svg class="animate-spin mx-auto h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p class="mt-2 text-gray-600">Loading setups...</p>
            </div>
          } @else if (setups().length === 0) {
            <div class="p-12 text-center">
              <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
              <h3 class="mt-2 text-sm font-medium text-gray-900">No setups found</h3>
              <p class="mt-1 text-sm text-gray-500">
                @if (hasActiveFilters()) {
                  Try adjusting your filters or
                } @else {
                  Import your first setup to get started
                }
              </p>
              <div class="mt-6">
                <button
                  (click)="goToImport()"
                  class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Import Setup
                </button>
              </div>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Car</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Track</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Condition</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Versions</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  @for (setup of setups(); track setup.id) {
                    <tr class="hover:bg-gray-50 cursor-pointer" (click)="openSetup(setup)">
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ setup.car }}</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{{ setup.track }}</td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{{ setup.condition }}</span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <span class="font-medium">{{ setup.versionCount }}</span> version{{ setup.versionCount !== 1 ? 's' : '' }}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{{ formatDate(setup.createdAt) }}</td>
                      <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          (click)="$event.stopPropagation(); openSetup(setup)"
                          class="text-indigo-600 hover:text-indigo-900 mr-3"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }

      <!-- Detail View -->
      @else if (viewMode() === 'detail' && selectedSetup()) {
        <div class="bg-white shadow rounded-lg overflow-hidden">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div class="flex items-center gap-4">
              <button
                (click)="backToList()"
                class="text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                <span class="hidden sm:inline">Back to Library</span>
              </button>
              <div>
                <h2 class="text-xl font-bold text-gray-900">{{ selectedSetup()!.car }} — {{ selectedSetup()!.track }}</h2>
                <p class="text-sm text-gray-600">{{ selectedSetup()!.condition }} • {{ formatDate(selectedSetup()!.createdAt) }} • {{ selectedSetup()!.versions.length }} version{{ selectedSetup()!.versions.length !== 1 ? 's' : '' }}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              @if (selectedVersion() && selectedVersion()!.hasOverlay) {
                <button
                  (click)="exportVersion(selectedVersion()!)"
                  [disabled]="exportingVersion() === selectedVersion()!.versionNo"
                  class="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  @if (exportingVersion() === selectedVersion()!.versionNo) {
                    <svg class="animate-spin -ml-1 mr-1.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Exporting...
                  } @else {
                    Export .sto
                  }
                </button>
              } @else {
                <span class="px-3 py-1.5 text-sm text-gray-500 bg-gray-50 rounded-md">No export available (manual entry only)</span>
              }
            </div>
          </div>

          <!-- Version History -->
          <div class="p-6">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Version History</h3>
            @if (loadingDetail()) {
              <div class="text-center py-8">
                <svg class="animate-spin mx-auto h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <p class="mt-2 text-gray-600">Loading versions...</p>
              </div>
            } @else {
              <div class="space-y-3">
                @for (version of versions(); track version.id) {
                  <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div class="flex items-center gap-4">
                      <div class="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span class="text-indigo-600 font-bold text-lg">v{{ version.versionNo }}</span>
                      </div>
                      <div>
                        <p class="font-medium text-gray-900">Version {{ version.versionNo }}</p>
                        <p class="text-sm text-gray-600">
                          {{ formatDate(version.createdAt) }}
                          @if (version.parentVersionNo) {
                            • Parent: v{{ version.parentVersionNo }}
                          } @else {
                            • Initial version
                          }
                        </p>
                        @if (version.hasOverlay) {
                          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mt-1">Has typed overlay</span>
                        } @else {
                          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 mt-1">Manual entry only</span>
                        }
                      </div>
                    </div>
                    <div class="flex items-center gap-2 sm:ml-auto">
                      <button
                        (click)="selectForDiff(version, 'from')"
                        [class.bg-indigo-100]="diffFromVersionNo() === version.versionNo"
                        [class.text-indigo-700]="diffFromVersionNo() === version.versionNo"
                        class="px-3 py-1.5 border rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        {{ diffFromVersionNo() === version.versionNo ? '✓ From' : 'Diff from' }}
                      </button>
                      <button
                        (click)="selectForDiff(version, 'to')"
                        [class.bg-indigo-100]="diffToVersionNo() === version.versionNo"
                        [class.text-indigo-700]="diffToVersionNo() === version.versionNo"
                        class="px-3 py-1.5 border rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        {{ diffToVersionNo() === version.versionNo ? '✓ To' : 'Diff to' }}
                      </button>
                      @if (diffFromVersion() && diffToVersion() && diffFromVersion() !== diffToVersion()) {
                        <button
                          (click)="showDiff()"
                          class="px-3 py-1.5 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                          Compare
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            }

            <!-- Feedback Section -->
            <div class="mt-8 pt-6 border-t border-gray-200">
<div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-medium text-gray-900">Feedback</h3>
              <button
                (click)="loadAllFeedback()"
                [disabled]="loadingAllFeedback()"
                class="text-sm text-indigo-600 hover:text-indigo-800"
              >
                Load all feedback
              </button>
            </div>

              @for (version of versions(); track version.id) {
                <div class="mb-6">
                  <div class="flex items-center justify-between mb-3">
                    <h4 class="font-medium text-gray-900">Version {{ version.versionNo }} Feedback</h4>
                    <button
                      (click)="loadFeedbackForVersion(version)"
                      [disabled]="isFeedbackLoading(version.versionNo)"
                      class="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      @if (isFeedbackLoading(version.versionNo)) {
                        <svg class="animate-spin inline h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Loading...
                      } @else {
                        Load feedback
                      }
                    </button>
                  </div>

                  @if (feedbackForVersion(version.id).length > 0) {
                    <div class="space-y-3">
                      @for (feedback of feedbackForVersion(version.id); track feedback.id) {
                        <div class="border border-gray-200 rounded-lg p-4">
                          <div class="flex items-start justify-between gap-4">
                            <div class="flex-1 min-w-0">
                              <p class="text-gray-900 whitespace-pre-wrap">{{ feedback.text }}</p>
                              @if (feedback.lapDeltaMs !== null && feedback.lapDeltaMs !== undefined) {
                                <p class="mt-1 text-sm text-gray-600">
                                  Lap delta: {{ feedback.lapDeltaMs > 0 ? '+' : '' }}{{ feedback.lapDeltaMs }} ms
                                </p>
                              }
                              <p class="mt-2 text-xs text-gray-500">{{ formatDate(feedback.createdAt) }}</p>
                            </div>
                            <div class="flex items-center gap-2 flex-shrink-0">
                              @if (editingFeedbackId() === feedback.id) {
                                <button
                                  (click)="saveEditFeedback(feedback.id)"
                                  class="px-3 py-1 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded"
                                >
                                  Save
                                </button>
                                <button
                                  (click)="cancelEditFeedback()"
                                  class="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded"
                                >
                                  Cancel
                                </button>
                              } @else {
                                <button
                                  (click)="startEditFeedback(feedback)"
                                  class="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded"
                                >
                                  Edit
                                </button>
                                <button
                                  (click)="deleteFeedback(feedback.id)"
                                  class="px-3 py-1 text-sm font-medium text-red-600 bg-white border border-gray-300 hover:bg-red-50 rounded"
                                >
                                  Delete
                                </button>
                              }
                            </div>
                          </div>

                          @if (editingFeedbackId() === feedback.id) {
                            <form [formGroup]="editFeedbackForm" (ngSubmit)="saveEditFeedback(feedback.id)" class="mt-3 space-y-2">
                              <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Feedback text</label>
                                <textarea
                                  formControlName="text"
                                  rows="3"
                                  class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                ></textarea>
                              </div>
                              <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Lap delta (ms, optional)</label>
                                <input
                                  type="number"
                                  formControlName="lapDeltaMs"
                                  class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                  placeholder="e.g., -150 or +200"
                                />
                              </div>
                            </form>
                          }
                        </div>
                      }
                    </div>
                  }

                  <!-- Add Feedback Form -->
                  <div class="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h5 class="font-medium text-gray-900 mb-3">Add Feedback</h5>
                    <form [formGroup]="addFormFor(version.id)" (ngSubmit)="submitFeedback(version)" class="space-y-3">
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Feedback text <span class="text-red-500">*</span></label>
                        <textarea
                          formControlName="text"
                          rows="3"
                          class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          placeholder="Enter your feedback for this version..."
                        ></textarea>
                        @if (addFormFor(version.id).get('text')?.invalid && addFormFor(version.id).get('text')?.touched) {
                          <p class="mt-1 text-sm text-red-600">Feedback text is required</p>
                        }
                      </div>
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Lap delta (ms, optional)</label>
                        <input
                          type="number"
                          formControlName="lapDeltaMs"
                          class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          placeholder="e.g., -150 or +200"
                        />
                      </div>
                      <button
                        type="submit"
                        [disabled]="addFormFor(version.id).invalid || submittingFeedback() === version.versionNo"
                        class="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        @if (submittingFeedback() === version.versionNo) {
                          <svg class="animate-spin -ml-1 mr-2 h-4 w-4 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          Adding...
                        } @else {
                          Add Feedback
                        }
                      </button>
                    </form>
                  </div>
                </div>
              }
            </div>

            <!-- Tags Section -->
            <div class="mt-8 pt-6 border-t border-gray-200">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-medium text-gray-900">Tags</h3>
                <button
                  (click)="loadTags()"
                  [disabled]="loadingTags()"
                  class="text-sm text-indigo-600 hover:text-indigo-800"
                >
                  @if (loadingTags()) {
                    <svg class="animate-spin inline h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Loading...
                  } @else {
                    Reload tags
                  }
                </button>
              </div>

              @if (tags().length > 0) {
                <div class="flex flex-wrap gap-2 mb-4">
                  @for (tag of tags(); track tag) {
                    <span class="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm">
                      {{ tag }}
                      <button
                        (click)="removeTag(tag)"
                        class="text-indigo-500 hover:text-indigo-700 font-bold leading-none"
                        aria-label="Remove tag"
                      >
                        ✕
                      </button>
                    </span>
                  }
                </div>
              } @else {
                <p class="text-sm text-gray-500 mb-4">No tags yet</p>
              }

              <div class="flex gap-2">
                <input
                  type="text"
                  [value]="tagInput()"
                  (input)="tagInput.set($event.target.value)"
                  (keyup.enter)="addTag()"
                  placeholder="Add a tag..."
                  class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
                <button
                  (click)="addTag()"
                  [disabled]="!tagInput().trim() || savingTags()"
                  class="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  @if (savingTags()) {
                    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Saving...
                  } @else {
                    Add Tag
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Diff View -->
      @else if (viewMode() === 'diff' && diffResult()) {
        <div class="bg-white shadow rounded-lg overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div class="flex items-center gap-4">
              <button
                (click)="backToDetail()"
                class="text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                <span class="hidden sm:inline">Back to Versions</span>
              </button>
              <div>
                <h2 class="text-xl font-bold text-gray-900">Diff: v{{ diffFromVersionNo() }} → v{{ diffToVersionNo() }}</h2>
                <p class="text-sm text-gray-600">{{ selectedSetup()?.car }} — {{ selectedSetup()?.track }}</p>
              </div>
            </div>
          </div>

          <div class="p-6">
            @if (loadingDiff()) {
              <div class="text-center py-8">
                <svg class="animate-spin mx-auto h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <p class="mt-2 text-gray-600">Computing diff...</p>
              </div>
            } @else if (diffIsTyped()) {
              <div class="space-y-4">
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">Typed Diff</span>
                  <span class="text-sm text-gray-600">{{ typedDiffData()!.changedFields.length }} field{{ typedDiffData()!.changedFields.length !== 1 ? 's' : '' }} changed</span>
                </div>
                @if (typedDiffData()!.changedFields.length === 0) {
                  <div class="text-center py-8 text-gray-500">No differences found</div>
                } @else {
                  <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                      <thead class="bg-gray-50">
                        <tr>
                          <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Field</th>
                          <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Old Value (v{{ diffFromVersionNo() }})</th>
                          <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">New Value (v{{ diffToVersionNo() }})</th>
                        </tr>
                      </thead>
                      <tbody class="bg-white divide-y divide-gray-200">
                        @for (field of typedDiffData()!.changedFields; track field.field) {
                          <tr class="hover:bg-gray-50">
                            <td class="px-4 py-3 text-sm font-medium text-gray-900 font-mono">{{ field.field }}</td>
                            <td class="px-4 py-3 text-sm text-gray-700">{{ field.oldValue || '(empty)' }}</td>
                            <td class="px-4 py-3 text-sm text-gray-700">{{ field.newValue || '(empty)' }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              </div>
            } @else if (diffIsByte()) {
              <div class="space-y-4">
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">Byte Diff</span>
                  <span class="text-sm text-gray-600">{{ byteDiffData()!.regions.length }} region{{ byteDiffData()!.regions.length !== 1 ? 's' : '' }} changed</span>
                </div>
                @if (byteDiffData()!.regions.length === 0) {
                  <div class="text-center py-8 text-gray-500">Files are identical</div>
                } @else {
                  <div class="space-y-3">
                    @for (region of byteDiffData()!.regions; track region.offset) {
                      <div class="border border-gray-200 rounded-lg p-4">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                          <div>
                            <label class="block text-xs font-medium text-gray-500">Offset</label>
                            <span class="font-mono text-sm text-gray-900">{{ region.offset }}</span>
                          </div>
                          <div>
                            <label class="block text-xs font-medium text-gray-500">Length</label>
                            <span class="font-mono text-sm text-gray-900">{{ region.length }} bytes</span>
                          </div>
                          <div>
                            <label class="block text-xs font-medium text-gray-500">Type</label>
                            <span class="text-sm text-gray-900">Byte region diff</span>
                          </div>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">Old Bytes (v{{ diffFromVersionNo() }})</label>
                            <pre class="bg-red-50 p-3 rounded text-xs font-mono text-red-800 overflow-auto max-h-32">{{ region.oldBytes }}</pre>
                          </div>
                          <div>
                            <label class="block text-xs font-medium text-gray-500 mb-1">New Bytes (v{{ diffToVersionNo() }})</label>
                            <pre class="bg-green-50 p-3 rounded text-xs font-mono text-green-800 overflow-auto max-h-32">{{ region.newBytes }}</pre>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class LibraryComponent implements OnInit {
  private libraryService = inject(LibraryService)
  private authService = inject(AuthService)
  private router = inject(Router)
  private route = inject(ActivatedRoute)
  private fb = inject(FormBuilder)

  // State
  setups = signal<SetupListItem[]>([])
  selectedSetup = signal<SetupDetail | null>(null)
  versions = signal<VersionSummary[]>([])
  viewMode = signal<ViewMode>('list')
  isLoading = signal(false)
  loadingDetail = signal(false)
  loadingDiff = signal(false)
  error = signal<string | null>(null)
  exportingVersion = signal<number | null>(null)

  // Feedback state
  // feedbackByVersion: versionId → list; 'all' key stores the setup-wide flat list.
  feedbackByVersion = signal<Record<string, FeedbackEntry[]>>({})
  loadingFeedback = signal<Record<number, boolean>>({})
  loadingAllFeedback = signal(false)
  submittingFeedback = signal<number | null>(null)
  editingFeedbackId = signal<string | null>(null)
  // Separate forms so add-per-version and edit don't share state.
  addFeedbackForms: Record<string, ReturnType<FormBuilder['group']>> = {}
  editFeedbackForm = this.fb.group({
    text: ['', Validators.required],
    lapDeltaMs: [null as number | null],
  })

  feedbackForVersion(versionId: string): FeedbackEntry[] {
    return this.feedbackByVersion()[versionId] ?? []
  }

  addFormFor(versionId: string) {
    if (!this.addFeedbackForms[versionId]) {
      this.addFeedbackForms[versionId] = this.fb.group({
        text: ['', Validators.required],
        lapDeltaMs: [null as number | null],
      })
    }
    return this.addFeedbackForms[versionId]
  }

  // Tags state
  tags = signal<string[]>([])
  loadingTags = signal(false)
  savingTags = signal(false)
  tagInput = signal('')

  // Diff state — stores UUIDs; version numbers are derived for display
  diffFromVersion = signal<string | null>(null)
  diffToVersion = signal<string | null>(null)
  diffResult = signal<DiffResult | null>(null)

  diffFromVersionNo = computed(() => {
    const id = this.diffFromVersion()
    if (!id) return null
    return this.versions().find(v => v.id === id)?.versionNo ?? null
  })

  diffToVersionNo = computed(() => {
    const id = this.diffToVersion()
    if (!id) return null
    return this.versions().find(v => v.id === id)?.versionNo ?? null
  })

  // Filter form
  filterForm = this.fb.group({
    car: [''],
    track: [''],
    condition: [''],
  })

  // Computed filter options
  availableCars = computed(() => {
    const cars = new Set(this.setups().map(s => s.car))
    return Array.from(cars).sort()
  })

  availableTracks = computed(() => {
    const tracks = new Set(this.setups().map(s => s.track))
    return Array.from(tracks).sort()
  })

  availableConditions = computed(() => {
    const conditions = new Set(this.setups().map(s => s.condition))
    return Array.from(conditions).sort()
  })

  hasActiveFilters = computed(() => {
    const v = this.filterForm.value
    return !!(v.car || v.track || v.condition)
  })

  selectedVersion = computed(() => {
    if (!this.selectedSetup()) return null
    // Return the first version with overlay for export button
    return this.versions().find(v => v.hasOverlay) || null
  })

  // Diff type detection for template
  diffIsTyped = computed(() => {
    const result = this.diffResult()
    return result ? 'changedFields' in result.data : false
  })

  diffIsByte = computed(() => {
    const result = this.diffResult()
    return result ? 'regions' in result.data : false
  })

  typedDiffData = computed(() => {
    const result = this.diffResult()
    return result && 'changedFields' in result.data ? result.data : null
  })

  byteDiffData = computed(() => {
    const result = this.diffResult()
    return result && 'regions' in result.data ? result.data : null
  })

  constructor() {
    // React to filter changes
    effect(() => {
      const query: SetupListQuery = {
        car: this.filterForm.value.car || undefined,
        track: this.filterForm.value.track || undefined,
        condition: this.filterForm.value.condition || undefined,
      }
      this.loadSetups(query)
    })
  }

  ngOnInit(): void {
    // Deep-link: load detail if id in URL; otherwise the effect() in the
    // constructor already triggers loadSetups on filterForm's initial value.
    const setupId = this.route.snapshot.paramMap.get('id')
    if (setupId) {
      this.loadSetupDetail(setupId)
    }
  }

  loadSetups(query: SetupListQuery): void {
    this.isLoading.set(true)
    this.error.set(null)
    this.libraryService.listSetups(query).subscribe({
      next: (setups) => {
        this.setups.set(setups)
        this.isLoading.set(false)
      },
      error: (err) => {
        this.isLoading.set(false)
        if (err.status === 401) {
          this.error.set('Session expired. Please log in again.')
          this.router.navigate(['/login'])
        } else {
          this.error.set('Failed to load setups. Please try again.')
        }
      },
    })
  }

  loadSetupDetail(setupId: string): void {
    this.loadingDetail.set(true)
    this.error.set(null)
    this.libraryService.getSetup(setupId).subscribe({
      next: (setup) => {
        this.selectedSetup.set(setup)
        this.versions.set(setup.versions.sort((a, b) => b.versionNo - a.versionNo)) // Latest first
        this.viewMode.set('detail')
        this.loadingDetail.set(false)
        // Clear diff selection
        this.diffFromVersion.set(null)
        this.diffToVersion.set(null)
        this.diffResult.set(null)
      },
      error: (err) => {
        this.loadingDetail.set(false)
        if (err.status === 401) {
          this.error.set('Session expired. Please log in again.')
          this.router.navigate(['/login'])
        } else if (err.status === 404) {
          this.error.set('Setup not found.')
          this.backToList()
        } else {
          this.error.set('Failed to load setup details.')
        }
      },
    })
  }

  openSetup(setup: SetupListItem): void {
    this.router.navigate(['/library', setup.id])
    this.loadSetupDetail(setup.id)
  }

  backToList(): void {
    this.router.navigate(['/library'])
    this.selectedSetup.set(null)
    this.versions.set([])
    this.viewMode.set('list')
    this.diffFromVersion.set(null)
    this.diffToVersion.set(null)
    this.diffResult.set(null)
  }

  backToDetail(): void {
    this.viewMode.set('detail')
    this.diffResult.set(null)
    this.loadingDiff.set(false)
  }

  selectForDiff(version: VersionSummary, which: 'from' | 'to'): void {
    if (which === 'from') {
      this.diffFromVersion.set(this.diffFromVersion() === version.id ? null : version.id)
    } else {
      this.diffToVersion.set(this.diffToVersion() === version.id ? null : version.id)
    }
  }

  showDiff(): void {
    const fromId = this.diffFromVersion()
    const toId = this.diffToVersion()
    const fromNo = this.diffFromVersionNo()
    const toNo = this.diffToVersionNo()
    if (!fromId || !toId || fromId === toId || fromNo == null || toNo == null) return

    this.loadingDiff.set(true)
    this.diffResult.set(null)
    this.viewMode.set('diff')

    // Ensure fromVersion < toVersion (backend requires this)
    const [firstId, secondId, firstNo, secondNo] = fromNo < toNo
      ? [fromId, toId, fromNo, toNo]
      : [toId, fromId, toNo, fromNo]

    this.libraryService.getDiff({ fromVersion: firstId, toVersion: secondId }).subscribe({
      next: (result) => {
        if ('changedFields' in result) {
          this.diffResult.set({ type: 'typed', data: result, fromVersion: firstNo, toVersion: secondNo })
        } else {
          this.diffResult.set({ type: 'byte', data: result, fromVersion: firstNo, toVersion: secondNo })
        }
        this.loadingDiff.set(false)
      },
      error: (err) => {
        this.loadingDiff.set(false)
        if (err.status === 401) {
          this.error.set('Session expired. Please log in again.')
          this.router.navigate(['/login'])
        } else {
          this.error.set('Failed to compute diff. Please try again.')
        }
      },
    })
  }

  exportVersion(version: VersionSummary): void {
    const setup = this.selectedSetup()
    if (!setup) return

    this.exportingVersion.set(version.versionNo)
    this.libraryService.exportVersion(version.id).subscribe({
      next: (response) => {
        this.exportingVersion.set(null)
        if (response.success) {
          this.downloadStoFile(setup.id, version)
        } else {
          this.error.set(response.error || 'Export failed')
        }
      },
      error: () => {
        this.exportingVersion.set(null)
        this.error.set('Failed to export setup.')
      },
    })
  }

  private downloadStoFile(setupId: string, version: VersionSummary): void {
    fetch(`/api/versions/${version.id}/file`, {
      credentials: 'include',
      headers: this.authHeader(),
    })
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${setupId}-v${version.versionNo}.sto`
        a.click()
        window.URL.revokeObjectURL(url)
      })
      .catch(() => {
        this.error.set('Failed to download file.')
      })
  }

  private authHeader(): Record<string, string> {
    const token = this.authService.getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // Feedback methods
  loadFeedbackForVersion(version: VersionSummary): void {
    this.loadingFeedback.update(v => ({ ...v, [version.versionNo]: true }))
    this.libraryService.listFeedbackByVersion(version.id).subscribe({
      next: (feedback) => {
        this.feedbackByVersion.update(map => ({ ...map, [version.id]: feedback }))
        this.loadingFeedback.update(v => ({ ...v, [version.versionNo]: false }))
      },
      error: () => {
        this.loadingFeedback.update(v => ({ ...v, [version.versionNo]: false }))
        this.error.set('Failed to load feedback.')
      },
    })
  }

  loadAllFeedback(): void {
    const setup = this.selectedSetup()
    if (!setup) return
    this.loadingAllFeedback.set(true)
    this.libraryService.listFeedbackBySetup(setup.id).subscribe({
      next: (feedback) => {
        // Bucket by versionNo → versionId mapping so per-version sections show their entries.
        const byVersion: Record<string, FeedbackEntry[]> = {}
        for (const version of this.versions()) {
          byVersion[version.id] = feedback.filter(f => f.versionNo === version.versionNo)
        }
        this.feedbackByVersion.set(byVersion)
        this.loadingAllFeedback.set(false)
      },
      error: () => {
        this.loadingAllFeedback.set(false)
        this.error.set('Failed to load feedback.')
      },
    })
  }

  submitFeedback(version: VersionSummary): void {
    const form = this.addFormFor(version.id)
    if (form.invalid) return
    const body = form.getRawValue() as CreateFeedbackRequest
    this.submittingFeedback.set(version.versionNo)
    this.libraryService.createFeedback(version.id, body).subscribe({
      next: (entry) => {
        this.feedbackByVersion.update(map => ({
          ...map,
          [version.id]: [entry, ...(map[version.id] ?? [])],
        }))
        form.reset({ text: '', lapDeltaMs: null })
        this.submittingFeedback.set(null)
      },
      error: () => {
        this.submittingFeedback.set(null)
        this.error.set('Failed to add feedback.')
      },
    })
  }

  startEditFeedback(feedback: FeedbackEntry): void {
    this.editingFeedbackId.set(feedback.id)
    this.editFeedbackForm.setValue({
      text: feedback.text,
      lapDeltaMs: feedback.lapDeltaMs ?? null,
    })
  }

  saveEditFeedback(feedbackId: string): void {
    if (this.editFeedbackForm.invalid) return
    const body = this.editFeedbackForm.getRawValue() as Partial<CreateFeedbackRequest>
    this.libraryService.updateFeedback(feedbackId, body).subscribe({
      next: (updated) => {
        this.feedbackByVersion.update(map => {
          const next: Record<string, FeedbackEntry[]> = {}
          for (const key of Object.keys(map)) {
            next[key] = (map[key] ?? []).map(f => f.id === feedbackId ? updated : f)
          }
          return next
        })
        this.editingFeedbackId.set(null)
        this.editFeedbackForm.reset({ text: '', lapDeltaMs: null })
      },
      error: () => this.error.set('Failed to update feedback.'),
    })
  }

  cancelEditFeedback(): void {
    this.editingFeedbackId.set(null)
    this.editFeedbackForm.reset({ text: '', lapDeltaMs: null })
  }

  deleteFeedback(feedbackId: string): void {
    if (!confirm('Delete this feedback?')) return
    this.libraryService.deleteFeedback(feedbackId).subscribe({
      next: () => {
        this.feedbackByVersion.update(map => {
          const next: Record<string, FeedbackEntry[]> = {}
          for (const key of Object.keys(map)) {
            next[key] = (map[key] ?? []).filter(f => f.id !== feedbackId)
          }
          return next
        })
      },
      error: () => this.error.set('Failed to delete feedback.'),
    })
  }

  isFeedbackLoading(versionNo: number): boolean {
    return this.loadingFeedback()[versionNo] === true
  }

  // Tags methods
  loadTags(): void {
    const setup = this.selectedSetup()
    if (!setup) return
    this.loadingTags.set(true)
    this.libraryService.getTags(setup.id).subscribe({
      next: (response) => {
        this.tags.set(response.tags)
        this.loadingTags.set(false)
      },
      error: () => {
        this.loadingTags.set(false)
        this.error.set('Failed to load tags.')
      },
    })
  }

  addTag(): void {
    const tag = this.tagInput().trim()
    if (!tag) return
    const setup = this.selectedSetup()
    if (!setup) return
    this.savingTags.set(true)
    this.libraryService.updateTags(setup.id, { tags: [...this.tags(), tag] }).subscribe({
      next: (response) => {
        this.tags.set(response.tags)
        this.tagInput.set('')
        this.savingTags.set(false)
      },
      error: () => {
        this.savingTags.set(false)
        this.error.set('Failed to add tag.')
      },
    })
  }

  removeTag(tagName: string): void {
    const setup = this.selectedSetup()
    if (!setup) return
    this.savingTags.set(true)
    this.libraryService.deleteTags(setup.id, { tags: [tagName] }).subscribe({
      next: (response) => {
        this.tags.set(response.tags)
        this.savingTags.set(false)
      },
      error: () => {
        this.savingTags.set(false)
        this.error.set('Failed to remove tag.')
      },
    })
  }

  clearFilters(): void {
    this.filterForm.reset({ car: '', track: '', condition: '' })
  }

  goToImport(): void {
    this.router.navigate(['/import'])
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
}