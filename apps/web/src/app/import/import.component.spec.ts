import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing'
import { ReactiveFormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { of, throwError } from 'rxjs'
import { ImportComponent } from './import.component'
import { ImportService } from './import.service'
import { AuthService } from '../auth/auth.service'
import type { ImportPreviewResponse, ImportConfirmResponse } from '@pit-wall/api-contracts'

class MockImportService {
  preview = vi.fn().mockReturnValue(of({} as ImportPreviewResponse))
  confirm = vi.fn().mockReturnValue(of({} as ImportConfirmResponse))
}

class MockAuthService {
  logout = vi.fn().mockReturnValue(of(void 0))
}

class MockRouter {
  navigate = vi.fn().mockReturnValue(Promise.resolve(true))
}

describe('ImportComponent', () => {
  let component: ImportComponent
  let fixture: ComponentFixture<ImportComponent>
  let importService: MockImportService
  let router: MockRouter

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportComponent, ReactiveFormsModule],
      providers: [
        { provide: ImportService, useClass: MockImportService },
        { provide: AuthService, useClass: MockAuthService },
        { provide: Router, useClass: MockRouter },
      ],
    }).compileComponents()

    fixture = TestBed.createComponent(ImportComponent)
    component = fixture.componentInstance
    importService = TestBed.inject(ImportService) as unknown as MockImportService
    router = TestBed.inject(Router) as unknown as MockRouter
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  describe('initial state', () => {
    it('should start at upload step', () => {
      expect(component.step()).toBe('upload')
    })

    it('should have no files selected', () => {
      expect(component.stoFile()).toBeNull()
      expect(component.htmlFile()).toBeNull()
    })

    it('should have empty manual form with one category', () => {
      expect(component.categoriesArray.length).toBe(1)
    })
  })

  describe('file selection', () => {
    it('should set stoFile when file input changes', () => {
      const file = new File(['test'], 'setup.sto', { type: 'application/octet-stream' })
      const event = { target: { files: [file] } } as unknown as Event

      component.onStoFileChange(event)

      expect(component.stoFile()).toBe(file)
      expect(component.error()).toBeNull()
    })

    it('should set htmlFile when file input changes', () => {
      const file = new File(['<html>'], 'setup.htm', { type: 'text/html' })
      const event = { target: { files: [file] } } as unknown as Event

      component.onHtmlFileChange(event)

      expect(component.htmlFile()).toBe(file)
    })
  })

  describe('upload', () => {
    const mockPreview: ImportPreviewResponse = {
      metadata: {
        car: 'Ferrari 296 GT3',
        track: 'Spa-Francorchamps',
        category: 'GT3',
        notes: 'Test notes',
        sha256: 'a'.repeat(64),
      },
      sha256: 'a'.repeat(64),
    }

    beforeEach(() => {
      const file = new File(['test'], 'setup.sto', { type: 'application/octet-stream' })
      component.stoFile.set(file)
    })

    it('should call importService.preview and move to preview step on success', fakeAsync(() => {
      importService.preview.mockReturnValue(of(mockPreview))

      component.onUpload()
      tick()

      expect(importService.preview).toHaveBeenCalled()
      expect(component.step()).toBe('preview')
      expect(component.preview()).toEqual(mockPreview)
      expect(component.isLoading()).toBeFalse()
    }))

    it('should show error on 400 response', fakeAsync(() => {
      importService.preview.mockReturnValue(throwError(() => ({ status: 400, error: { message: 'Invalid file' } })))

      component.onUpload()
      tick()

      expect(component.error()).toBe('Invalid file')
      expect(component.step()).toBe('upload')
      expect(component.isLoading()).toBeFalse()
    }))

    it('should show session expired error on 401', fakeAsync(() => {
      importService.preview.mockReturnValue(throwError(() => ({ status: 401 })))

      component.onUpload()
      tick()

      expect(component.error()).toBe('Session expired. Please log in again.')
    }))

    it('should show generic error on other failures', fakeAsync(() => {
      importService.preview.mockReturnValue(throwError(() => ({ status: 500 })))

      component.onUpload()
      tick()

      expect(component.error()).toBe('Failed to analyze setup. Please try again.')
    }))
  })

  describe('preview step', () => {
    const mockPreview: ImportPreviewResponse = {
      metadata: {
        car: 'Ferrari 296 GT3',
        track: 'Spa-Francorchamps',
        category: 'GT3',
        notes: 'Test notes',
        sha256: 'a'.repeat(64),
      },
      sha256: 'a'.repeat(64),
    }

    beforeEach(() => {
      component.preview.set(mockPreview)
      component.step.set('preview')
    })

    it('should show cancel button', () => {
      const compiled = fixture.nativeElement
      expect(compiled.querySelector('button:contains("Cancel")')).toBeTruthy()
    })

    it('should show confirm button', () => {
      const compiled = fixture.nativeElement
      expect(compiled.querySelector('button:contains("Confirm & Save")')).toBeTruthy()
    })

    it('should show manual entry button when no htmlOverlay', () => {
      const compiled = fixture.nativeElement
      expect(compiled.querySelector('button:contains("Enter Typed Values Manually")')).toBeTruthy()
    })

    describe('cancel', () => {
      it('should reset all state on cancel', () => {
        component.stoFile.set(new File(['test'], 'setup.sto', { type: 'application/octet-stream' }))
        component.onCancel()

        expect(component.step()).toBe('upload')
        expect(component.stoFile()).toBeNull()
        expect(component.preview()).toBeNull()
      })
    })

    describe('confirm', () => {
      const mockConfirmResponse: ImportConfirmResponse = {
        setupId: 'setup-123',
        versionNo: 1,
        sha256: 'a'.repeat(64),
      }

      it('should call confirm with metadata and htmlOverlay when present', fakeAsync(() => {
        component.preview.set({
          ...mockPreview,
          htmlOverlay: { categories: { Tires: { Pressure: '27.5' } } },
        })
        importService.confirm.mockReturnValue(of(mockConfirmResponse))

        component.onConfirm()
        tick()

        expect(importService.confirm).toHaveBeenCalled()
        const callArgs = importService.confirm.mock.calls[0][1] as any
        expect(callArgs.metadata).toEqual(mockPreview.metadata)
        expect(callArgs.htmlOverlay).toEqual({ categories: { Tires: { Pressure: '27.5' } } })
        expect(callArgs.manualOverlay).toBeUndefined()
        expect(router.navigate).toHaveBeenCalledWith(['/library', 'setup-123'])
      }))

      it('should include manualOverlay when in manual-entry step', fakeAsync(() => {
        component.step.set('manual-entry')
        component.manualOverlay.set({ categories: { Suspension: { Camber: '-3.5' } } })
        importService.confirm.mockReturnValue(of(mockConfirmResponse))

        component.onConfirm()
        tick()

        const callArgs = importService.confirm.mock.calls[0][1] as any
        expect(callArgs.manualOverlay).toEqual({ categories: { Suspension: { Camber: '-3.5' } } })
      }))
    })

    describe('edit manual', () => {
      it('should switch to manual-entry step and reset form', () => {
        component.onEditManual()

        expect(component.step()).toBe('manual-entry')
        expect(component.categoriesArray.length).toBe(1)
        expect(component.manualOverlay()).toBeNull()
      })
    })
  })

  describe('manual entry step', () => {
    beforeEach(() => {
      component.step.set('manual-entry')
      component.preview.set({
        metadata: { car: 'Test', track: 'Test', category: 'GT3', notes: '', sha256: 'a'.repeat(64) },
        sha256: 'a'.repeat(64),
      })
      fixture.detectChanges()
    })

    it('should have form with one category and one parameter', () => {
      expect(component.categoriesArray.length).toBe(1)
      expect(component.getParamsArray(0).length).toBe(1)
    })

    it('should add category when addCategory called', () => {
      component.addCategory()
      expect(component.categoriesArray.length).toBe(2)
    })

    it('should not remove category when only one', () => {
      component.removeCategory(0)
      expect(component.categoriesArray.length).toBe(1)
    })

    it('should add parameter when addParameter called', () => {
      component.addParameter(0)
      expect(component.getParamsArray(0).length).toBe(2)
    })

    it('should build manualOverlay from form on confirm', fakeAsync(() => {
      const mockConfirmResponse: ImportConfirmResponse = {
        setupId: 'setup-123',
        versionNo: 1,
        sha256: 'a'.repeat(64),
      }
      importService.confirm.mockReturnValue(of(mockConfirmResponse))

      // Fill form
      component.categoriesArray.at(0).get('name')?.setValue('Tires')
      component.getParamsArray(0).at(0).get('name')?.setValue('Front Pressure')
      component.getParamsArray(0).at(0).get('value')?.setValue('27.5')

      component.onConfirm()
      tick()

      expect(component.manualOverlay()).toEqual({
        categories: {
          Tires: { 'Front Pressure': '27.5' },
        },
      })
    }))

    describe('back to preview', () => {
      it('should return to preview step', () => {
        component.onBackToPreview()
        expect(component.step()).toBe('preview')
      })
    })
  })
})