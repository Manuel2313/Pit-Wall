import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { AuthService } from './auth.service'
import { map, catchError, of } from 'rxjs'

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService)
  const router = inject(Router)

  if (auth.isAuthenticated()) {
    return true
  }

  return auth.restoreSession().pipe(
    map((user) => {
      if (user) {
        return true
      }
      router.navigate(['/login'], { queryParams: { redirect: state.url } })
      return false
    }),
    catchError(() => {
      router.navigate(['/login'], { queryParams: { redirect: state.url } })
      return of(false)
    })
  )
}