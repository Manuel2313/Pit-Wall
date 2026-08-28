import { z } from 'zod/v4'

/**
 * @pit-wall/api-contracts
 * Shared Zod 4 DTO schemas and inferred types for Pit Wall API.
 * Single source of truth for request/response validation across apps/api and apps/web.
 */

// ============================================================================
// Auth Schemas
// ============================================================================

/** POST /auth/register request */
export const registerRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
})

/** POST /auth/register response */
export const registerResponseSchema = z.object({
  userId: z.string().min(1),
  email: z.email(),
})

/** POST /auth/login request */
export const loginRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

/** POST /auth/login response */
export const loginResponseSchema = z.object({
  sessionToken: z.string().min(1),
})

/** GET /auth/me response */
export const meResponseSchema = z.object({
  userId: z.string().min(1),
  email: z.email(),
})

/** POST /auth/recover request */
export const recoverRequestSchema = z.object({
  email: z.email(),
})

/** POST /auth/reset request */
export const resetRequestSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
})

// ============================================================================
// Catalog Schemas
// ============================================================================

/** Car category enum - GT3 or Porsche Cup only (per PRD) */
export const carCategorySchema = z.enum(['GT3', 'Porsche Cup'])

/** Car schema */
export const carSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: carCategorySchema,
})

/** Track schema */
export const trackSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  layout: z.string().min(1),
})

/** GET /catalog/cars response */
export const catalogCarsResponseSchema = z.array(carSchema)

/** GET /catalog/tracks response */
export const catalogTracksResponseSchema = z.array(trackSchema)

// ============================================================================
// Setup/Import Schemas
// ============================================================================

/** .sto file metadata extracted on upload */
export const stoMetadataSchema = z.object({
  car: z.string().min(1),
  track: z.string().min(1),
  category: z.string().min(1),
  notes: z.string(),
})

/** SHA-256 hash (64 hex chars) */
const sha256Schema = z.string().length(64).regex(/^[a-f0-9]{64}$/)

/** Typed CarSetup overlay from HTML export or manual entry */
export const carSetupOverlaySchema = z.object({
  categories: z.record(z.string(), z.record(z.string(), z.string())),
})

/** POST /setups preview response (metadata + sha256 + optional HTML overlay) */
export const importPreviewResponseSchema = z.object({
  metadata: stoMetadataSchema,
  sha256: sha256Schema,
  htmlOverlay: carSetupOverlaySchema.optional(),
})

/** POST /setups confirm request */
export const importConfirmRequestSchema = z.object({
  metadata: stoMetadataSchema,
  htmlOverlay: carSetupOverlaySchema.optional(),
  manualOverlay: carSetupOverlaySchema.optional(),
})

/** POST /setups confirm response */
export const importConfirmResponseSchema = z.object({
  setupId: z.string().min(1),
  versionNo: z.int().positive(),
  sha256: sha256Schema,
})

/** GET /setups query params */
export const setupListQuerySchema = z.object({
  car: z.string().optional(),
  track: z.string().optional(),
  condition: z.string().optional(),
})

/** Setup list item */
export const setupListItemSchema = z.object({
  id: z.string().min(1),
  car: z.string().min(1),
  track: z.string().min(1),
  condition: z.string().min(1),
  createdAt: z.iso.datetime(),
  versionCount: z.int().nonnegative(),
})

/** GET /setups/:id response */
export const setupDetailSchema = z.object({
  id: z.string().min(1),
  car: z.string().min(1),
  track: z.string().min(1),
  condition: z.string().min(1),
  createdAt: z.iso.datetime(),
  versions: z.array(
    z.object({
      versionNo: z.int().positive(),
      parentVersionNo: z.int().positive().nullable(),
      sha256: sha256Schema,
      createdAt: z.iso.datetime(),
      hasOverlay: z.boolean(),
    })
  ),
})

/** Version summary (for lists) */
export const versionSummarySchema = z.object({
  versionNo: z.int().positive(),
  parentVersionNo: z.int().positive().nullable(),
  sha256: sha256Schema,
  createdAt: z.iso.datetime(),
  hasOverlay: z.boolean(),
})

/** Version detail (includes overlay when present; hasOverlay is optional here since it's derivable from overlay) */
export const versionDetailSchema = versionSummarySchema.extend({
  hasOverlay: z.boolean().optional(),
  overlay: carSetupOverlaySchema.optional(),
})

// ============================================================================
// Diff Schemas
// ============================================================================

/** GET /diff query params */
export const diffRequestSchema = z.object({
  fromVersion: z.string().uuid(),
  toVersion: z.string().uuid(),
}).refine((data) => data.fromVersion !== data.toVersion, {
  message: 'fromVersion must be different from toVersion',
  path: ['fromVersion'],
})

/** Single typed diff field */
export const typedDiffFieldSchema = z.object({
  field: z.string().min(1),
  oldValue: z.string(),
  newValue: z.string(),
})

/** Typed diff response (when both versions have overlays) */
export const typedDiffResponseSchema = z.object({
  changedFields: z.array(typedDiffFieldSchema),
})

/** Byte diff region */
export const byteDiffRegionSchema = z.object({
  offset: z.int().nonnegative(),
  length: z.int().positive(),
  oldBytes: z.string(),
  newBytes: z.string(),
})

/** Byte diff response (when no overlays or partial) */
export const byteDiffResponseSchema = z.object({
  regions: z.array(byteDiffRegionSchema),
})

// ============================================================================
// Feedback Schemas
// ============================================================================

/** POST /versions/:vid/feedback request */
export const createFeedbackRequestSchema = z.object({
  text: z.string().min(1),
  lapDeltaMs: z.int().optional(),
})

/** Feedback entry */
export const feedbackEntrySchema = z.object({
  id: z.string().min(1),
  versionNo: z.int().positive(),
  text: z.string().min(1),
  lapDeltaMs: z.int().optional(),
  createdAt: z.iso.datetime(),
})

/** GET /setups/:id/feedback response */
export const feedbackListResponseSchema = z.array(feedbackEntrySchema)

// ============================================================================
// Tags Schemas
// ============================================================================

/** PUT /setups/:id/tags request */
export const updateTagsRequestSchema = z.object({
  tags: z.array(z.string().min(1)),
})

/** GET /setups/:id/tags response */
export const tagsResponseSchema = z.object({
  tags: z.array(z.string().min(1)),
})

// ============================================================================
// Export Schemas
// ============================================================================

/** GET /versions/:vid/file response */
export const exportResponseSchema = z.union([
  z.object({
    success: z.literal(true),
    sha256: sha256Schema,
    filename: z.string().min(1),
  }),
  z.object({
    success: z.literal(false),
    error: z.string().min(1),
  }),
])

// ============================================================================
// Error Schemas
// ============================================================================

/** Single validation error */
export const validationErrorSchema = z.object({
  field: z.string().min(1),
  message: z.string().min(1),
})

/** API error response */
export const apiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.record(z.string(), z.unknown()).optional(),
})

// ============================================================================
// Health Schemas
// ============================================================================

/** GET /health response */
export const healthResponseSchema = z.object({
  status: z.enum(['ok', 'error']),
  db: z.boolean().optional(),
})

// ============================================================================
// Inferred Types
// ============================================================================

export type RegisterRequest = z.infer<typeof registerRequestSchema>
export type RegisterResponse = z.infer<typeof registerResponseSchema>
export type LoginRequest = z.infer<typeof loginRequestSchema>
export type LoginResponse = z.infer<typeof loginResponseSchema>
export type MeResponse = z.infer<typeof meResponseSchema>
export type RecoverRequest = z.infer<typeof recoverRequestSchema>
export type ResetRequest = z.infer<typeof resetRequestSchema>

export type CarCategory = z.infer<typeof carCategorySchema>
export type Car = z.infer<typeof carSchema>
export type Track = z.infer<typeof trackSchema>
export type CatalogCarsResponse = z.infer<typeof catalogCarsResponseSchema>
export type CatalogTracksResponse = z.infer<typeof catalogTracksResponseSchema>

export type StoMetadata = z.infer<typeof stoMetadataSchema>
export type CarSetupOverlay = z.infer<typeof carSetupOverlaySchema>
export type ImportPreviewResponse = z.infer<typeof importPreviewResponseSchema>
export type ImportConfirmRequest = z.infer<typeof importConfirmRequestSchema>
export type ImportConfirmResponse = z.infer<typeof importConfirmResponseSchema>
export type SetupListQuery = z.infer<typeof setupListQuerySchema>
export type SetupListItem = z.infer<typeof setupListItemSchema>
export type SetupDetail = z.infer<typeof setupDetailSchema>
export type VersionSummary = z.infer<typeof versionSummarySchema>
export type VersionDetail = z.infer<typeof versionDetailSchema>

export type DiffRequest = z.infer<typeof diffRequestSchema>
export type TypedDiffField = z.infer<typeof typedDiffFieldSchema>
export type TypedDiffResponse = z.infer<typeof typedDiffResponseSchema>
export type ByteDiffRegion = z.infer<typeof byteDiffRegionSchema>
export type ByteDiffResponse = z.infer<typeof byteDiffResponseSchema>

export type CreateFeedbackRequest = z.infer<typeof createFeedbackRequestSchema>
export type FeedbackEntry = z.infer<typeof feedbackEntrySchema>
export type FeedbackListResponse = z.infer<typeof feedbackListResponseSchema>

export type UpdateTagsRequest = z.infer<typeof updateTagsRequestSchema>
export type TagsResponse = z.infer<typeof tagsResponseSchema>

export type ExportResponse = z.infer<typeof exportResponseSchema>

export type ValidationError = z.infer<typeof validationErrorSchema>
export type ApiError = z.infer<typeof apiErrorSchema>

export type HealthResponse = z.infer<typeof healthResponseSchema>