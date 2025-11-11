/**
 * Guard de autenticação
 * Protege rotas que requerem autenticação
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Verificar se o usuário está autenticado
  if (authService.isAuthenticated()) {
    return true;
  }

  // Se não estiver autenticado, redirecionar para login
  console.log('❌ Acesso negado - usuário não autenticado');
  router.navigate(['/login'], { 
    queryParams: { returnUrl: state.url } 
  });
  
  return false;
};
