import { describe, it, expect } from 'vitest'
import {
  // Auth
  registerRequestSchema,
  registerResponseSchema,
  loginRequestSchema,
  loginResponseSchema,
  meResponseSchema,
  recoverRequestSchema,
  resetRequestSchema,
  // Catalog
  carSchema,
  trackSchema,
  catalogCarsResponseSchema,
  catalogTracksResponseSchema,
  // Setup/Import
  stoMetadataSchema,
  importPreviewResponseSchema,
  importConfirmRequestSchema,
  importConfirmResponseSchema,
  setupListQuerySchema,
  setupListItemSchema,
  setupDetailSchema,
  versionSummarySchema,
  versionDetailSchema,
  // Diff
  diffRequestSchema,
  typedDiffFieldSchema,
  typedDiffResponseSchema,
  byteDiffRegionSchema,
  byteDiffResponseSchema,
  // Feedback
  createFeedbackRequestSchema,
  feedbackEntrySchema,
  feedbackListResponseSchema,
  // Tags
  updateTagsRequestSchema,
  tagsResponseSchema,
  // Export
  exportResponseSchema,
  // Error
  validationErrorSchema,
  apiErrorSchema,
  // Health
  healthResponseSchema,
} from '../src'

describe('api-contracts: Zod 4 DTO schemas', () => {
  describe('Auth schemas', () => {
    describe('registerRequestSchema', () => {
      it('accepts valid email and password >= 8 chars', () => {
        const result = registerRequestSchema.safeParse({ email: 'test@example.com', password: 'password123' })
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.email).toBe('test@example.com')
          expect(result.data.password).toBe('password123')
        }
      })

      it('rejects invalid email format', () => {
        const result = registerRequestSchema.safeParse({ email: 'not-an-email', password: 'password123' })
        expect(result.success).toBe(false)
      })

      it('rejects password shorter than 8 chars', () => {
        const result = registerRequestSchema.safeParse({ email: 'test@example.com', password: 'short' })
        expect(result.success).toBe(false)
      })

      it('rejects missing fields', () => {
        const result = registerRequestSchema.safeParse({ email: 'test@example.com' })
        expect(result.success).toBe(false)
      })
    })

    describe('registerResponseSchema', () => {
      it('accepts valid userId and email', () => {
        const result = registerResponseSchema.safeParse({ userId: 'usr_abc123', email: 'test@example.com' })
        expect(result.success).toBe(true)
      })

      it('rejects missing userId', () => {
        const result = registerResponseSchema.safeParse({ email: 'test@example.com' })
        expect(result.success).toBe(false)
      })
    })

    describe('loginRequestSchema', () => {
      it('accepts valid email and password', () => {
        const result = loginRequestSchema.safeParse({ email: 'test@example.com', password: 'password123' })
        expect(result.success).toBe(true)
      })

      it('rejects invalid email', () => {
        const result = loginRequestSchema.safeParse({ email: 'bad', password: 'password123' })
        expect(result.success).toBe(false)
      })
    })

    describe('loginResponseSchema', () => {
      it('accepts session token', () => {
        const result = loginResponseSchema.safeParse({ sessionToken: 'sess_xyz789' })
        expect(result.success).toBe(true)
      })
    })

    describe('meResponseSchema', () => {
      it('accepts userId and email', () => {
        const result = meResponseSchema.safeParse({ userId: 'usr_abc123', email: 'test@example.com' })
        expect(result.success).toBe(true)
      })
    })

    describe('recoverRequestSchema', () => {
      it('accepts valid email', () => {
        const result = recoverRequestSchema.safeParse({ email: 'test@example.com' })
        expect(result.success).toBe(true)
      })

      it('rejects invalid email', () => {
        const result = recoverRequestSchema.safeParse({ email: 'bad' })
        expect(result.success).toBe(false)
      })
    })

    describe('resetRequestSchema', () => {
      it('accepts token and new password >= 8 chars', () => {
        const result = resetRequestSchema.safeParse({ token: 'reset_abc123', newPassword: 'newpassword123' })
        expect(result.success).toBe(true)
      })

      it('rejects password shorter than 8 chars', () => {
        const result = resetRequestSchema.safeParse({ token: 'reset_abc123', newPassword: 'short' })
        expect(result.success).toBe(false)
      })
    })
  })

  describe('Catalog schemas', () => {
    describe('carSchema', () => {
      it('accepts valid car with id, name, category', () => {
        const result = carSchema.safeParse({ id: 'ferrari_296_gt3', name: 'Ferrari 296 GT3', category: 'GT3' })
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.category).toBe('GT3')
        }
      })

      it('rejects invalid category (not GT3 or Porsche Cup)', () => {
        const result = carSchema.safeParse({ id: 'gt4_car', name: 'GT4 Car', category: 'GT4' })
        expect(result.success).toBe(false)
      })

      it('accepts Porsche Cup category', () => {
        const result = carSchema.safeParse({ id: 'porsche_911_gt3_cup', name: 'Porsche 911 GT3 Cup 992', category: 'Porsche Cup' })
        expect(result.success).toBe(true)
      })
    })

    describe('trackSchema', () => {
      it('accepts valid track with id, name, layout', () => {
        const result = trackSchema.safeParse({ id: 'spa', name: 'Spa-Francorchamps', layout: 'Grand Prix' })
        expect(result.success).toBe(true)
      })
    })

    describe('catalogCarsResponseSchema', () => {
      it('accepts array of cars', () => {
        const result = catalogCarsResponseSchema.safeParse([
          { id: 'ferrari_296_gt3', name: 'Ferrari 296 GT3', category: 'GT3' },
          { id: 'porsche_911_gt3_cup', name: 'Porsche 911 GT3 Cup 992', category: 'Porsche Cup' },
        ])
        expect(result.success).toBe(true)
      })

      it('rejects invalid car in array', () => {
        const result = catalogCarsResponseSchema.safeParse([
          { id: 'ferrari_296_gt3', name: 'Ferrari 296 GT3', category: 'GT3' },
          { id: 'gt4_car', name: 'GT4 Car', category: 'GT4' },
        ])
        expect(result.success).toBe(false)
      })
    })

    describe('catalogTracksResponseSchema', () => {
      it('accepts array of tracks', () => {
        const result = catalogTracksResponseSchema.safeParse([
          { id: 'spa', name: 'Spa-Francorchamps', layout: 'Grand Prix' },
        ])
        expect(result.success).toBe(true)
      })
    })
  })

  describe('Setup/Import schemas', () => {
    describe('stoMetadataSchema', () => {
      it('accepts valid metadata with car, track, category, notes', () => {
        const result = stoMetadataSchema.safeParse({
          car: 'Ferrari 296 GT3',
          track: 'Spa-Francorchamps',
          category: 'GT3',
          notes: 'Test setup notes',
        })
        expect(result.success).toBe(true)
      })

      it('accepts metadata with empty notes', () => {
        const result = stoMetadataSchema.safeParse({
          car: 'Ferrari 296 GT3',
          track: 'Spa-Francorchamps',
          category: 'GT3',
          notes: '',
        })
        expect(result.success).toBe(true)
      })

      it('rejects missing required fields', () => {
        const result = stoMetadataSchema.safeParse({ car: 'Ferrari 296 GT3' })
        expect(result.success).toBe(false)
      })
    })

    describe('importPreviewResponseSchema', () => {
      it('accepts preview with metadata, sha256, and optional htmlOverlay', () => {
        const result = importPreviewResponseSchema.safeParse({
          metadata: { car: 'Ferrari 296 GT3', track: 'Spa', category: 'GT3', notes: 'notes' },
          sha256: 'a'.repeat(64),
          htmlOverlay: { categories: { tires: { StartingPressureLF: '159 kPa' } } },
        })
        expect(result.success).toBe(true)
      })

      it('accepts preview without htmlOverlay', () => {
        const result = importPreviewResponseSchema.safeParse({
          metadata: { car: 'Ferrari 296 GT3', track: 'Spa', category: 'GT3', notes: 'notes' },
          sha256: 'a'.repeat(64),
        })
        expect(result.success).toBe(true)
      })

      it('rejects invalid sha256 length', () => {
        const result = importPreviewResponseSchema.safeParse({
          metadata: { car: 'Ferrari 296 GT3', track: 'Spa', category: 'GT3', notes: 'notes' },
          sha256: 'short',
        })
        expect(result.success).toBe(false)
      })
    })

    describe('importConfirmRequestSchema', () => {
      it('accepts confirm with metadata and optional overlays', () => {
        const result = importConfirmRequestSchema.safeParse({
          metadata: { car: 'Ferrari 296 GT3', track: 'Spa', category: 'GT3', notes: 'notes' },
          htmlOverlay: { categories: { tires: { StartingPressureLF: '159 kPa' } } },
        })
        expect(result.success).toBe(true)
      })

      it('accepts confirm with manual overlay only', () => {
        const result = importConfirmRequestSchema.safeParse({
          metadata: { car: 'Ferrari 296 GT3', track: 'Spa', category: 'GT3', notes: 'notes' },
          manualOverlay: { categories: { tires: { StartingPressureLF: '160 kPa' } } },
        })
        expect(result.success).toBe(true)
      })

      it('accepts confirm with no overlays', () => {
        const result = importConfirmRequestSchema.safeParse({
          metadata: { car: 'Ferrari 296 GT3', track: 'Spa', category: 'GT3', notes: 'notes' },
        })
        expect(result.success).toBe(true)
      })
    })

    describe('importConfirmResponseSchema', () => {
      it('accepts setupId, versionNo, sha256', () => {
        const result = importConfirmResponseSchema.safeParse({
          setupId: 'setup_abc123',
          versionNo: 1,
          sha256: 'a'.repeat(64),
        })
        expect(result.success).toBe(true)
      })

      it('rejects versionNo < 1', () => {
        const result = importConfirmResponseSchema.safeParse({
          setupId: 'setup_abc123',
          versionNo: 0,
          sha256: 'a'.repeat(64),
        })
        expect(result.success).toBe(false)
      })
    })

    describe('setupListQuerySchema', () => {
      it('accepts optional car, track, condition filters', () => {
        const result = setupListQuerySchema.safeParse({ car: 'ferrari_296_gt3', track: 'spa', condition: 'race' })
        expect(result.success).toBe(true)
      })

      it('accepts empty query', () => {
        const result = setupListQuerySchema.safeParse({})
        expect(result.success).toBe(true)
      })
    })

    describe('setupListItemSchema', () => {
      it('accepts valid setup list item', () => {
        const result = setupListItemSchema.safeParse({
          id: 'setup_abc123',
          car: 'Ferrari 296 GT3',
          track: 'Spa-Francorchamps',
          condition: 'race',
          createdAt: '2024-01-15T10:30:00Z',
          versionCount: 3,
        })
        expect(result.success).toBe(true)
      })
    })

    describe('setupDetailSchema', () => {
      it('accepts setup detail with versions array', () => {
        const result = setupDetailSchema.safeParse({
          id: 'setup_abc123',
          car: 'Ferrari 296 GT3',
          track: 'Spa-Francorchamps',
          condition: 'race',
          createdAt: '2024-01-15T10:30:00Z',
          versions: [
            { versionNo: 1, parentVersionNo: null, sha256: 'a'.repeat(64), createdAt: '2024-01-15T10:30:00Z', hasOverlay: true },
            { versionNo: 2, parentVersionNo: 1, sha256: 'b'.repeat(64), createdAt: '2024-01-16T10:30:00Z', hasOverlay: true },
          ],
        })
        expect(result.success).toBe(true)
      })
    })

    describe('versionSummarySchema', () => {
      it('accepts version summary with all fields', () => {
        const result = versionSummarySchema.safeParse({
          versionNo: 1,
          parentVersionNo: null,
          sha256: 'a'.repeat(64),
          createdAt: '2024-01-15T10:30:00Z',
          hasOverlay: true,
        })
        expect(result.success).toBe(true)
      })

      it('accepts version summary with parentVersionNo', () => {
        const result = versionSummarySchema.safeParse({
          versionNo: 2,
          parentVersionNo: 1,
          sha256: 'b'.repeat(64),
          createdAt: '2024-01-16T10:30:00Z',
          hasOverlay: false,
        })
        expect(result.success).toBe(true)
      })
    })

    describe('versionDetailSchema', () => {
      it('accepts version detail with optional overlay', () => {
        const result = versionDetailSchema.safeParse({
          versionNo: 1,
          parentVersionNo: null,
          sha256: 'a'.repeat(64),
          createdAt: '2024-01-15T10:30:00Z',
          overlay: { categories: { tires: { StartingPressureLF: '159 kPa' } } },
        })
        expect(result.success).toBe(true)
      })

      it('accepts version detail without overlay', () => {
        const result = versionDetailSchema.safeParse({
          versionNo: 1,
          parentVersionNo: null,
          sha256: 'a'.repeat(64),
          createdAt: '2024-01-15T10:30:00Z',
        })
        expect(result.success).toBe(true)
      })
    })
  })

  describe('Diff schemas', () => {
    describe('diffRequestSchema', () => {
      it('accepts from and to version numbers', () => {
        const result = diffRequestSchema.safeParse({ fromVersion: 1, toVersion: 2 })
        expect(result.success).toBe(true)
      })

      it('rejects fromVersion >= toVersion', () => {
        const result = diffRequestSchema.safeParse({ fromVersion: 2, toVersion: 1 })
        expect(result.success).toBe(false)
      })

      it('rejects fromVersion < 1', () => {
        const result = diffRequestSchema.safeParse({ fromVersion: 0, toVersion: 2 })
        expect(result.success).toBe(false)
      })
    })

    describe('typedDiffFieldSchema', () => {
      it('accepts field, oldValue, newValue', () => {
        const result = typedDiffFieldSchema.safeParse({
          field: 'tires.StartingPressureLF',
          oldValue: '159 kPa',
          newValue: '160 kPa',
        })
        expect(result.success).toBe(true)
      })
    })

    describe('typedDiffResponseSchema', () => {
      it('accepts array of changed fields', () => {
        const result = typedDiffResponseSchema.safeParse({
          changedFields: [
            { field: 'tires.StartingPressureLF', oldValue: '159 kPa', newValue: '160 kPa' },
            { field: 'suspension.FrontCamberLF', oldValue: '-3.5 deg', newValue: '-4.0 deg' },
          ],
        })
        expect(result.success).toBe(true)
      })

      it('accepts empty array (no changes)', () => {
        const result = typedDiffResponseSchema.safeParse({ changedFields: [] })
        expect(result.success).toBe(true)
      })
    })

    describe('byteDiffRegionSchema', () => {
      it('accepts offset, length, oldBytes, newBytes', () => {
        const result = byteDiffRegionSchema.safeParse({
          offset: 100,
          length: 10,
          oldBytes: 'AAAAAAAAAA',
          newBytes: 'BBBBBBBBBB',
        })
        expect(result.success).toBe(true)
      })
    })

    describe('byteDiffResponseSchema', () => {
      it('accepts array of byte diff regions', () => {
        const result = byteDiffResponseSchema.safeParse({
          regions: [
            { offset: 100, length: 10, oldBytes: 'AAAAAAAAAA', newBytes: 'BBBBBBBBBB' },
          ],
        })
        expect(result.success).toBe(true)
      })
    })
  })

  describe('Feedback schemas', () => {
    describe('createFeedbackRequestSchema', () => {
      it('accepts text and optional lapDeltaMs', () => {
        const result = createFeedbackRequestSchema.safeParse({ text: 'Car feels loose', lapDeltaMs: 150 })
        expect(result.success).toBe(true)
      })

      it('accepts text only (lapDeltaMs optional)', () => {
        const result = createFeedbackRequestSchema.safeParse({ text: 'Good setup' })
        expect(result.success).toBe(true)
      })

      it('rejects empty text', () => {
        const result = createFeedbackRequestSchema.safeParse({ text: '' })
        expect(result.success).toBe(false)
      })

      it('rejects missing text', () => {
        const result = createFeedbackRequestSchema.safeParse({ lapDeltaMs: 100 })
        expect(result.success).toBe(false)
      })
    })

    describe('feedbackEntrySchema', () => {
      it('accepts feedback entry with all fields', () => {
        const result = feedbackEntrySchema.safeParse({
          id: 'fb_abc123',
          versionNo: 2,
          text: 'Car feels loose',
          lapDeltaMs: 150,
          createdAt: '2024-01-16T14:00:00Z',
        })
        expect(result.success).toBe(true)
      })

      it('accepts feedback entry without lapDeltaMs', () => {
        const result = feedbackEntrySchema.safeParse({
          id: 'fb_abc123',
          versionNo: 2,
          text: 'Good setup',
          createdAt: '2024-01-16T14:00:00Z',
        })
        expect(result.success).toBe(true)
      })
    })

    describe('feedbackListResponseSchema', () => {
      it('accepts array of feedback entries', () => {
        const result = feedbackListResponseSchema.safeParse([
          { id: 'fb_1', versionNo: 1, text: 'First', createdAt: '2024-01-15T10:00:00Z' },
          { id: 'fb_2', versionNo: 2, text: 'Second', lapDeltaMs: 50, createdAt: '2024-01-16T10:00:00Z' },
        ])
        expect(result.success).toBe(true)
      })
    })
  })

  describe('Tags schemas', () => {
    describe('updateTagsRequestSchema', () => {
      it('accepts array of tags', () => {
        const result = updateTagsRequestSchema.safeParse({ tags: ['qualifying', 'rain', 'test'] })
        expect(result.success).toBe(true)
      })

      it('accepts empty array', () => {
        const result = updateTagsRequestSchema.safeParse({ tags: [] })
        expect(result.success).toBe(true)
      })

      it('rejects non-array', () => {
        const result = updateTagsRequestSchema.safeParse({ tags: 'not-array' })
        expect(result.success).toBe(false)
      })
    })

    describe('tagsResponseSchema', () => {
      it('accepts array of tags', () => {
        const result = tagsResponseSchema.safeParse({ tags: ['qualifying', 'rain'] })
        expect(result.success).toBe(true)
      })
    })
  })

  describe('Export schemas', () => {
    describe('exportResponseSchema', () => {
      it('accepts success with file info', () => {
        const result = exportResponseSchema.safeParse({
          success: true,
          sha256: 'a'.repeat(64),
          filename: 'setup_v1.sto',
        })
        expect(result.success).toBe(true)
      })

      it('accepts error for manual-only version', () => {
        const result = exportResponseSchema.safeParse({
          success: false,
          error: 'No export available for manual-only version',
        })
        expect(result.success).toBe(true)
      })
    })
  })

  describe('Error schemas', () => {
    describe('validationErrorSchema', () => {
      it('accepts field and message', () => {
        const result = validationErrorSchema.safeParse({ field: 'email', message: 'Invalid email format' })
        expect(result.success).toBe(true)
      })
    })

    describe('apiErrorSchema', () => {
      it('accepts code, message, and optional details', () => {
        const result = apiErrorSchema.safeParse({
          code: 'UNAUTHORIZED',
          message: 'Session expired',
          details: { sessionId: 'sess_abc123' },
        })
        expect(result.success).toBe(true)
      })

      it('accepts code and message without details', () => {
        const result = apiErrorSchema.safeParse({ code: 'NOT_FOUND', message: 'Setup not found' })
        expect(result.success).toBe(true)
      })
    })
  })

  describe('Health schemas', () => {
    describe('healthResponseSchema', () => {
      it('accepts healthy status with db true', () => {
        const result = healthResponseSchema.safeParse({ status: 'ok', db: true })
        expect(result.success).toBe(true)
      })

      it('accepts error status with db false', () => {
        const result = healthResponseSchema.safeParse({ status: 'error', db: false })
        expect(result.success).toBe(true)
      })

      it('rejects invalid status', () => {
        const result = healthResponseSchema.safeParse({ status: 'unknown' })
        expect(result.success).toBe(false)
      })
    })
  })
})