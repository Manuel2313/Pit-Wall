import { TestBed } from '@angular/core/testing'
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing'
import { ImportService } from './import.service'
import type { ImportPreviewResponse, ImportConfirmRequest, ImportConfirmResponse } from '@pit-wall/api-contracts'

describe('ImportService', () => {
  let service: ImportService
  let httpMock: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ImportService],
    })
    service = TestBed.inject(ImportService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => {
    httpMock.verify()
  })

  it('should be created', () => {
    expect(service).toBeTruthy()
  })

  describe('preview', () => {
    it('should POST .sto file to /api/setups and return preview', () => {
      const mockFile = new File(['test content'], 'setup.sto', { type: 'application/octet-stream' })
      const mockHtmlFile = new File(['<html>test</html>'], 'setup.htm', { type: 'text/html' })
      const mockResponse: ImportPreviewResponse = {
        metadata: {
          car: 'Ferrari 296 GT3',
          track: 'Spa-Francorchamps',
          category: 'GT3',
          notes: 'Test setup',
        },
        sha256: 'a'.repeat(64),
        htmlOverlay: {
          categories: {
            Tires: { 'Front Pressure': '27.5', 'Rear Pressure': '27.0' },
          },
        },
      }

      service.preview(mockFile, mockHtmlFile).subscribe((response) => {
        expect(response).toEqual(mockResponse)
      })

      const req = httpMock.expectOne('/api/setups')
      expect(req.request.method).toBe('POST')
      expect(req.request.withCredentials).toBe(true)

      const formData = req.request.body as FormData
      expect(formData.get('file')).toBe(mockFile)
      expect(formData.get('htmlFile')).toBe(mockHtmlFile)

      req.flush(mockResponse)
    })

    it('should POST .sto file without htmlFile when not provided', () => {
      const mockFile = new File(['test content'], 'setup.sto', { type: 'application/octet-stream' })
      const mockResponse: ImportPreviewResponse = {
        metadata: {
          car: 'Ferrari 296 GT3',
          track: 'Spa-Francorchamps',
          category: 'GT3',
          notes: '',
        },
        sha256: 'a'.repeat(64),
      }

      service.preview(mockFile).subscribe((response) => {
        expect(response).toEqual(mockResponse)
      })

      const req = httpMock.expectOne('/api/setups')
      const formData = req.request.body as FormData
      expect(formData.get('file')).toBe(mockFile)
      expect(formData.get('htmlFile')).toBeNull()

      req.flush(mockResponse)
    })
  })

  describe('confirm', () => {
    it('should POST .sto file with metadata and overlays to /api/setups/confirm', () => {
      const mockFile = new File(['test content'], 'setup.sto', { type: 'application/octet-stream' })
      const mockHtmlFile = new File(['<html>test</html>'], 'setup.htm', { type: 'text/html' })
      const mockRequest: ImportConfirmRequest = {
        metadata: {
          car: 'Ferrari 296 GT3',
          track: 'Spa-Francorchamps',
          category: 'GT3',
          notes: 'Test setup',
          sha256: 'a'.repeat(64),
        },
        htmlOverlay: {
          categories: {
            Tires: { 'Front Pressure': '27.5' },
          },
        },
        manualOverlay: {
          categories: {
            Suspension: { 'Front Camber': '-3.5' },
          },
        },
      }
      const mockResponse: ImportConfirmResponse = {
        setupId: 'setup-123',
        versionNo: 1,
        sha256: 'a'.repeat(64),
      }

      service.confirm(mockFile, mockRequest, mockHtmlFile).subscribe((response) => {
        expect(response).toEqual(mockResponse)
      })

      const req = httpMock.expectOne('/api/setups/confirm')
      expect(req.request.method).toBe('POST')
      expect(req.request.withCredentials).toBe(true)

      const formData = req.request.body as FormData
      expect(formData.get('file')).toBe(mockFile)
      expect(formData.get('htmlFile')).toBe(mockHtmlFile)
      expect(formData.get('metadata')).toBe(JSON.stringify(mockRequest.metadata))
      expect(formData.get('htmlOverlay')).toBe(JSON.stringify(mockRequest.htmlOverlay))
      expect(formData.get('manualOverlay')).toBe(JSON.stringify(mockRequest.manualOverlay))

      req.flush(mockResponse)
    })

    it('should POST without optional overlays when not provided', () => {
      const mockFile = new File(['test content'], 'setup.sto', { type: 'application/octet-stream' })
      const mockRequest: ImportConfirmRequest = {
        metadata: {
          car: 'Ferrari 296 GT3',
          track: 'Spa-Francorchamps',
          category: 'GT3',
          notes: 'Test setup',
          sha256: 'a'.repeat(64),
        },
      }
      const mockResponse: ImportConfirmResponse = {
        setupId: 'setup-123',
        versionNo: 1,
        sha256: 'a'.repeat(64),
      }

      service.confirm(mockFile, mockRequest).subscribe((response) => {
        expect(response).toEqual(mockResponse)
      })

      const req = httpMock.expectOne('/api/setups/confirm')
      const formData = req.request.body as FormData
      expect(formData.get('file')).toBe(mockFile)
      expect(formData.get('htmlFile')).toBeNull()
      expect(formData.get('htmlOverlay')).toBeNull()
      expect(formData.get('manualOverlay')).toBeNull()

      req.flush(mockResponse)
    })
  })
})