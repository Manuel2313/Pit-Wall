import { HttpClient, HttpParams } from '@angular/common/http'
import { Injectable } from '@angular/core'
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

@Injectable({ providedIn: 'root' })
export class LibraryService {
  private readonly apiUrl = '/api'

  constructor(private http: HttpClient) {}

  listSetups(query: SetupListQuery = {}): Observable<SetupListItem[]> {
    let params = new HttpParams()
    if (query.car) params = params.set('car', query.car)
    if (query.track) params = params.set('track', query.track)
    if (query.condition) params = params.set('condition', query.condition)
    return this.http.get<SetupListItem[]>(`${this.apiUrl}/setups`, { params, withCredentials: true })
  }

  getSetup(setupId: string): Observable<SetupDetail> {
    return this.http.get<SetupDetail>(`${this.apiUrl}/setups/${setupId}`, { withCredentials: true })
  }

  getVersion(setupId: string, versionId: string): Observable<VersionDetail> {
    return this.http.get<VersionDetail>(`${this.apiUrl}/setups/${setupId}/versions/${versionId}`, { withCredentials: true })
  }

  getDiff(request: DiffRequest): Observable<TypedDiffResponse | ByteDiffResponse> {
    const params = new HttpParams()
      .set('fromVersion', request.fromVersion)
      .set('toVersion', request.toVersion)
    return this.http.get<TypedDiffResponse | ByteDiffResponse>(`${this.apiUrl}/setups/diff`, { params, withCredentials: true })
  }

  exportVersion(versionId: string): Observable<ExportResponse> {
    return this.http.get<ExportResponse>(`${this.apiUrl}/versions/${versionId}/file`, { withCredentials: true })
  }

  // Feedback
  createFeedback(versionId: string, body: CreateFeedbackRequest): Observable<FeedbackEntry> {
    return this.http.post<FeedbackEntry>(`${this.apiUrl}/versions/${versionId}/feedback`, body, { withCredentials: true })
  }

  listFeedbackByVersion(versionId: string): Observable<FeedbackListResponse> {
    return this.http.get<FeedbackListResponse>(`${this.apiUrl}/versions/${versionId}/feedback`, { withCredentials: true })
  }

  listFeedbackBySetup(setupId: string): Observable<FeedbackListResponse> {
    return this.http.get<FeedbackListResponse>(`${this.apiUrl}/setups/${setupId}/feedback`, { withCredentials: true })
  }

  updateFeedback(feedbackId: string, body: Partial<CreateFeedbackRequest>): Observable<FeedbackEntry> {
    return this.http.patch<FeedbackEntry>(`${this.apiUrl}/feedback/${feedbackId}`, body, { withCredentials: true })
  }

  deleteFeedback(feedbackId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/feedback/${feedbackId}`, { withCredentials: true })
  }

  // Tags
  updateTags(setupId: string, body: UpdateTagsRequest): Observable<TagsResponse> {
    return this.http.put<TagsResponse>(`${this.apiUrl}/setups/${setupId}/tags`, body, { withCredentials: true })
  }

  getTags(setupId: string): Observable<TagsResponse> {
    return this.http.get<TagsResponse>(`${this.apiUrl}/setups/${setupId}/tags`, { withCredentials: true })
  }

  deleteTags(setupId: string, body: UpdateTagsRequest): Observable<TagsResponse> {
    return this.http.request<TagsResponse>('DELETE', `${this.apiUrl}/setups/${setupId}/tags`, { body, withCredentials: true })
  }
}