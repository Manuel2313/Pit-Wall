import { HttpClient, HttpParams } from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import { Observable } from 'rxjs'
import type {
  SetupListItem,
  SetupListQuery,
  SetupDetail,
  VersionDetail,
  DiffRequest,
  TypedDiffResponse,
  ByteDiffResponse,
  ExportResponse,
  FeedbackEntry,
  CreateFeedbackRequest,
  FeedbackListResponse,
  UpdateTagsRequest,
  TagsResponse,
} from '@pit-wall/api-contracts'
import { AuthService } from '../auth/auth.service'

@Injectable({ providedIn: 'root' })
export class LibraryService {
  private readonly apiUrl = '/api'
  private readonly http = inject(HttpClient)
  private readonly auth = inject(AuthService)

  private authHeaders(): { Authorization: string } | Record<string, never> {
    const token = this.auth.getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  listSetups(query: SetupListQuery = {}): Observable<SetupListItem[]> {
    let params = new HttpParams()
    if (query.car) params = params.set('car', query.car)
    if (query.track) params = params.set('track', query.track)
    if (query.condition) params = params.set('condition', query.condition)
    return this.http.get<SetupListItem[]>(`${this.apiUrl}/setups`, { params, headers: this.authHeaders() })
  }

  getSetup(setupId: string): Observable<SetupDetail> {
    return this.http.get<SetupDetail>(`${this.apiUrl}/setups/${setupId}`, { headers: this.authHeaders() })
  }

  getVersion(setupId: string, versionId: string): Observable<VersionDetail> {
    return this.http.get<VersionDetail>(`${this.apiUrl}/setups/${setupId}/versions/${versionId}`, { headers: this.authHeaders() })
  }

  getDiff(request: DiffRequest): Observable<TypedDiffResponse | ByteDiffResponse> {
    const params = new HttpParams()
      .set('fromVersion', request.fromVersion)
      .set('toVersion', request.toVersion)
    return this.http.get<TypedDiffResponse | ByteDiffResponse>(`${this.apiUrl}/setups/diff`, { params, headers: this.authHeaders() })
  }

  exportVersion(versionId: string): Observable<ExportResponse> {
    return this.http.get<ExportResponse>(`${this.apiUrl}/versions/${versionId}/file`, { headers: this.authHeaders() })
  }

  // Feedback
  createFeedback(versionId: string, body: CreateFeedbackRequest): Observable<FeedbackEntry> {
    return this.http.post<FeedbackEntry>(`${this.apiUrl}/versions/${versionId}/feedback`, body, { headers: this.authHeaders() })
  }

  listFeedbackByVersion(versionId: string): Observable<FeedbackListResponse> {
    return this.http.get<FeedbackListResponse>(`${this.apiUrl}/versions/${versionId}/feedback`, { headers: this.authHeaders() })
  }

  listFeedbackBySetup(setupId: string): Observable<FeedbackListResponse> {
    return this.http.get<FeedbackListResponse>(`${this.apiUrl}/setups/${setupId}/feedback`, { headers: this.authHeaders() })
  }

  updateFeedback(feedbackId: string, body: Partial<CreateFeedbackRequest>): Observable<FeedbackEntry> {
    return this.http.patch<FeedbackEntry>(`${this.apiUrl}/feedback/${feedbackId}`, body, { headers: this.authHeaders() })
  }

  deleteFeedback(feedbackId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/feedback/${feedbackId}`, { headers: this.authHeaders() })
  }

  // Tags
  updateTags(setupId: string, body: UpdateTagsRequest): Observable<TagsResponse> {
    return this.http.put<TagsResponse>(`${this.apiUrl}/setups/${setupId}/tags`, body, { headers: this.authHeaders() })
  }

  getTags(setupId: string): Observable<TagsResponse> {
    return this.http.get<TagsResponse>(`${this.apiUrl}/setups/${setupId}/tags`, { headers: this.authHeaders() })
  }

  deleteTags(setupId: string, body: UpdateTagsRequest): Observable<TagsResponse> {
    return this.http.request<TagsResponse>('DELETE', `${this.apiUrl}/setups/${setupId}/tags`, { body, headers: this.authHeaders() })
  }
}