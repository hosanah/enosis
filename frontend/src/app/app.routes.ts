/**
 * Configuração de rotas do Angular
 * Define navegação entre login e dashboard
 */

import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';
import { MasterLayoutComponent } from './components/layout/component/master-layout';

export const routes: Routes = [
  // Rota de login
  {
    path: 'login',
    loadComponent: () => import('./components/login/login').then(m => m.LoginComponent)
  },

  // Reset de senha
  {
    path: 'reset-password',
    loadComponent: () => import('./components/reset-password/reset-password').then(m => m.ResetPasswordComponent)
  },

  // Rotas protegidas dentro do layout principal
  {
    path: '',
    component: MasterLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./components/dashboard/dashboard').then(m => m.DashboardComponent) },
      { path: 'users', loadComponent: () => import('./components/users/user-list').then(m => m.UserListComponent) },
      { path: 'users/new', loadComponent: () => import('./components/users/user-form').then(m => m.UserFormComponent) },
      { path: 'users/:id', loadComponent: () => import('./components/users/user-form').then(m => m.UserFormComponent) },
      { path: 'change-password', loadComponent: () => import('./components/change-password/change-password').then(m => m.ChangePasswordComponent) },
      { path: 'reserva-natal', loadComponent: () => import('./components/reserva-natal/reserva-natal').then(m => m.ReservaNatalComponent) },
      { path: 'reserva-ano-novo', loadComponent: () => import('./components/reserva-ano-novo/reserva-ano-novo').then(m => m.ReservaAnoNovoComponent) },
      { path: 'diretrizes', loadComponent: () => import('./components/diretrizes/diretrizes').then(m => m.DiretrizesComponent) },
      { path: 'relatorios', loadComponent: () => import('./components/relatorios/relatorios').then(m => m.RelatoriosComponent) },
      
      
      
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: '**', redirectTo: 'dashboard' }
    ]
  }
];
