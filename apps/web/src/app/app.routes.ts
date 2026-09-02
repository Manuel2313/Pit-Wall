import { Routes } from '@angular/router'
import { authGuard } from './auth/auth.guard'

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/layout.component').then((m) => m.LayoutComponent),
    children: [
      {
        path: 'import',
        loadComponent: () => import('./import/import.component').then((m) => m.ImportComponent),
      },
      {
        path: 'library/:id',
        loadComponent: () => import('./library/library.component').then((m) => m.LibraryComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
]