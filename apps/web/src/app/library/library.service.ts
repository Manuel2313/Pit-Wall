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
    return this.http.get<TypedDiffResponse | ByteDiffResponse>(`${this.apiUrl}/diff`, { params, withCredentials: true })
  }

  exportVersion(versionId: string): Observable<ExportResponse> {
    return this.http.get<ExportResponse>(`${this.apiUrl}/versions/${versionId}/file`, { withCredentials: true })
  }
}