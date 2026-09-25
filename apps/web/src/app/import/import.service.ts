import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Observable } from 'rxjs'
import type { ImportPreviewResponse, ImportConfirmRequest, ImportConfirmResponse } from '@pit-wall/api-contracts'

@Injectable({ providedIn: 'root' })
export class ImportService {
  private readonly apiUrl = '/api'

  constructor(private http: HttpClient) {}

  preview(stoFile: File, htmlFile?: File): Observable<ImportPreviewResponse> {
    const formData = new FormData()
    formData.append('file', stoFile)
    if (htmlFile) {
      formData.append('htmlFile', htmlFile)
    }
    return this.http.post<ImportPreviewResponse>(`${this.apiUrl}/setups`, formData, { withCredentials: true })
  }

  confirm(stoFile: File, dto: ImportConfirmRequest, htmlFile?: File): Observable<ImportConfirmResponse> {
    const formData = new FormData()
    formData.append('file', stoFile)
    if (htmlFile) {
      formData.append('htmlFile', htmlFile)
    }
    // Append the JSON body as a string
    formData.append('metadata', JSON.stringify(dto.metadata))
    formData.append('sha256', dto.sha256)
    if (dto.htmlOverlay) {
      formData.append('htmlOverlay', JSON.stringify(dto.htmlOverlay))
    }
    if (dto.manualOverlay) {
      formData.append('manualOverlay', JSON.stringify(dto.manualOverlay))
    }
    return this.http.post<ImportConfirmResponse>(`${this.apiUrl}/setups/confirm`, formData, { withCredentials: true })
  }
}