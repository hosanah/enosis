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
      { path: 'restaurantes', loadComponent: () => import('./components/restaurantes/restaurante-list').then(m => m.RestauranteListComponent) },
      { path: 'restaurantes/novo', loadComponent: () => import('./components/restaurantes/restaurante-form').then(m => m.RestauranteFormComponent) },
      { path: 'restaurantes/:id', loadComponent: () => import('./components/restaurantes/restaurante-form').then(m => m.RestauranteFormComponent) },
      { path: 'diretrizes', loadComponent: () => import('./components/diretrizes/diretriz-list').then(m => m.DiretrizListComponent) },
      { path: 'diretrizes/novo', loadComponent: () => import('./components/diretrizes/diretriz-form').then(m => m.DiretrizFormComponent) },
      { path: 'diretrizes/:id', loadComponent: () => import('./components/diretrizes/diretriz-form').then(m => m.DiretrizFormComponent) },
      { path: 'regras', loadComponent: () => import('./components/regras/regra-list').then(m => m.RegraListComponent) },
      { path: 'eventos', loadComponent: () => import('./components/eventos/evento-list').then(m => m.EventoListComponent) },
      { path: 'eventos/novo', loadComponent: () => import('./components/eventos/evento-form').then(m => m.EventoFormComponent) },
      { path: 'eventos/em-massa', loadComponent: () => import('./components/eventos/evento-bulk-form').then(m => m.EventoBulkFormComponent) },
      { path: 'eventos/:id', loadComponent: () => import('./components/eventos/evento-form').then(m => m.EventoFormComponent) },
      { path: 'reservas', loadComponent: () => import('./components/reservas/reserva-list').then(m => m.ReservaListComponent) },
      { path: 'reservas/novo', loadComponent: () => import('./components/reservas/reserva-form').then(m => m.ReservaFormComponent) },
      { path: 'reservas/:id', loadComponent: () => import('./components/reservas/reserva-form').then(m => m.ReservaFormComponent) },
      { path: 'reserva-evento', loadComponent: () => import('./components/reserva-evento/reserva-evento').then(m => m.ReservaEventoComponent) },
      { path: 'reserva-evento-list', loadComponent: () => import('./components/reserva-evento-list/reserva-evento-list').then(m => m.ReservaEventoListComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: '**', redirectTo: 'dashboard' }
    ]
  }
];
