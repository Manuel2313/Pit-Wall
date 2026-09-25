import { ApplicationConfig, provideZoneChangeDetection, APP_INITIALIZER } from '@angular/core'
import { provideRouter } from '@angular/router'
import { provideHttpClient, withInterceptors } from '@angular/common/http'
import { provideAnimations } from '@angular/platform-browser/animations'
import { AuthService } from './auth/auth.service'
import { authInterceptor } from './auth/auth.interceptor'
import { routes } from './app.routes'

function initAuth(auth: AuthService) {
  return () => auth.restoreSession()
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    {
      provide: APP_INITIALIZER,
      useFactory: initAuth,
      deps: [AuthService],
      multi: true,
    },
  ],
}