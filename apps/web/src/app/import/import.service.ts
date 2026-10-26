import { HttpClient } from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import { Observable } from 'rxjs'
import type { ImportPreviewResponse, ImportConfirmRequest, ImportConfirmResponse } from '@pit-wall/api-contracts'
import { AuthService } from '../auth/auth.service'

@Injectable({ providedIn: 'root' })
export class ImportService {
  private readonly apiUrl = '/api'
  private readonly http = inject(HttpClient)
  private readonly auth = inject(AuthService)

  private authHeaders(): { Authorization: string } | Record<string, never> {
    const token = this.auth.getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  preview(stoFile: File, htmlFile?: File): Observable<ImportPreviewResponse> {
    const formData = new FormData()
    formData.append('file', stoFile)
    if (htmlFile) {
      formData.append('htmlFile', htmlFile)
    }
    return this.http.post<ImportPreviewResponse>(`${this.apiUrl}/setups`, formData, {
      headers: this.authHeaders(),
    })
  }

  confirm(stoFile: File, dto: ImportConfirmRequest, htmlFile?: File): Observable<ImportConfirmResponse> {
    const formData = new FormData()
    formData.append('file', stoFile)
    if (htmlFile) {
      formData.append('htmlFile', htmlFile)
    }
    formData.append('metadata', JSON.stringify(dto.metadata))
    formData.append('sha256', dto.sha256)
    if (dto.htmlOverlay) {
      formData.append('htmlOverlay', JSON.stringify(dto.htmlOverlay))
    }
    if (dto.manualOverlay) {
      formData.append('manualOverlay', JSON.stringify(dto.manualOverlay))
    }
    return this.http.post<ImportConfirmResponse>(`${this.apiUrl}/setups/confirm`, formData, {
      headers: this.authHeaders(),
    })
  }
}