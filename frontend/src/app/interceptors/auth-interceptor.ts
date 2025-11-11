/**
 * Interceptor HTTP para autenticação
 * Adiciona automaticamente o token JWT nas requisições
 */

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError, switchMap } from 'rxjs';
import { AuthService } from '../services/auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  
  // Obter token do serviço de autenticação
  const token = authService.getToken();
  
  // Clonar a requisição e adicionar o header Authorization se o token existir
  let authReq = req;
  
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }
  
  // Processar a requisição e tratar erros de autenticação
  let refreshAttempted = false;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        if (req.url.includes('/auth/login')) {
          return throwError(() => error);
        }

        if (!refreshAttempted && !req.url.includes('/auth/refresh')) {
          refreshAttempted = true;
          return authService.refreshToken().pipe(
            switchMap(() => {
              const newToken = authService.getToken();
              const newReq = req.clone({
                setHeaders: { Authorization: `Bearer ${newToken}` }
              });
              return next(newReq);
            }),
            catchError(refreshError => {
              console.log('❌ Token inválido ou expirado - fazendo logout automático');
              authService.logout().subscribe({
                error: logoutError => {
                  console.error('Erro no logout automático:', logoutError);
                }
              });
              return throwError(() => refreshError);
            })
          );
        }

        console.log('❌ Token inválido ou expirado - fazendo logout automático');
        authService.logout().subscribe({
          error: logoutError => {
            console.error('Erro no logout automático:', logoutError);
          }
        });
      }

      return throwError(() => error);
    })
  );
};
