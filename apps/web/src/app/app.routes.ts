import { Routes } from '@angular/router'

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./app.component.ts').then((m) => m.AppComponent),
  },
]