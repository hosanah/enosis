/**
 * Serviço de autenticação
 * Gerencia login, logout e estado de autenticação
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable, tap, catchError, throwError, Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { IdleService } from './idle.service';

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
  expiresIn: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.apiUrl;
  private readonly API_KEY = environment.apiKey;
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';
  private refreshTokenTimeout: any;
  private idleSubscription?: Subscription;

  // Estado de autenticação reativo
  private authStateSubject = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null
  });

  public authState$ = this.authStateSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private idleService: IdleService
  ) {
    this.idleSubscription = this.idleService.timeout$.subscribe(() => {
      console.log('⌛ Usuário inativo - realizando logout automático');
      this.logout().subscribe();
    });
    this.checkStoredAuth();
  }

  /**
   * Verificar autenticação armazenada no localStorage
   */
  private checkStoredAuth(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userStr = localStorage.getItem(this.USER_KEY);

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        this.updateAuthState(true, user, token);
        this.startRefreshTokenTimer(token);
        this.startInactivityTimer(token);
      } catch (error) {
        console.error('Erro ao parsear dados do usuário:', error);
        this.clearStoredAuth();
      }
    }
  }

  /**
   * Atualizar estado de autenticação
   */
  private updateAuthState(isAuthenticated: boolean, user: User | null, token: string | null): void {
    this.authStateSubject.next({
      isAuthenticated,
      user,
      token
    });
  }

  /**
   * Realizar login
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/auth/login`, credentials)
      .pipe(
        tap(response => {
          // Salvar token e dados do usuário
          localStorage.setItem(this.TOKEN_KEY, response.token);
          localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));

          // Atualizar estado
          this.updateAuthState(true, response.user, response.token);
          this.startRefreshTokenTimer(response.token);
          this.startInactivityTimer(response.token);

          console.log('✅ Login realizado com sucesso:', response.user.username);
        }),
        catchError(error => {
          console.error('❌ Erro no login:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Realizar logout
   */
  logout(): Observable<any> {
    const token = this.getToken();
    
    if (!token) {
      this.performLogout();
      return new Observable(observer => {
        observer.next({ message: 'Logout realizado' });
        observer.complete();
      });
    }

    return this.http.post(`${this.API_URL}/auth/logout`, {})
      .pipe(
        tap(() => {
          console.log('✅ Logout realizado no servidor');
        }),
        catchError(error => {
          console.error('❌ Erro no logout do servidor:', error);
          // Mesmo com erro no servidor, fazer logout local
          return new Observable(observer => {
            observer.next({ message: 'Logout local realizado' });
            observer.complete();
          });
        }),
        tap(() => {
          this.performLogout();
        })
      );
  }

  /**
   * Realizar logout local
   */
  private performLogout(): void {
    this.clearStoredAuth();
    this.updateAuthState(false, null, null);
    this.stopRefreshTokenTimer();
    this.idleService.stop();
    this.router.navigate(['/login']);
    console.log('✅ Logout local realizado');
  }

  /**
   * Limpar dados de autenticação armazenados
   */
  private clearStoredAuth(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  /**
   * Iniciar temporizador para refresh do token
   */
  private startRefreshTokenTimer(token: string): void {
    this.stopRefreshTokenTimer();
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000;
      const timeout = exp - Date.now() - 60 * 1000; // 1 minuto antes do vencimento
      if (timeout > 0) {
        this.refreshTokenTimeout = setTimeout(() => {
          this.refreshToken().subscribe({
            error: err => {
              console.error('❌ Erro ao atualizar token automaticamente:', err);
              this.performLogout();
            }
          });
        }, timeout);
      }
    } catch (error) {
      console.error('Erro ao configurar timer de refresh:', error);
    }
  }

  /**
   * Iniciar monitoramento de inatividade do usuário
   */
  private startInactivityTimer(token: string): void {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const sessionDuration = (payload.exp - payload.iat) * 1000;
      const idleTimeout = (sessionDuration * 2) / 3;
      if (idleTimeout > 0) {
        this.idleService.start(idleTimeout);
      }
    } catch (error) {
      console.error('Erro ao configurar timer de inatividade:', error);
    }
  }

  /**
   * Cancelar temporizador de refresh do token
   */
  private stopRefreshTokenTimer(): void {
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
      this.refreshTokenTimeout = null;
    }
  }

  /**
   * Atualizar token
   */
  refreshToken(): Observable<any> {
    return this.http.post<{ token: string }>(`${this.API_URL}/auth/refresh`, {}, {
      headers: { 'x-api-key': this.API_KEY }
    })
      .pipe(
        tap(res => {
          localStorage.setItem(this.TOKEN_KEY, res.token);
          const userStr = localStorage.getItem(this.USER_KEY);
          const user = userStr ? JSON.parse(userStr) : this.authStateSubject.value.user;
          if (user) {
            localStorage.setItem(this.USER_KEY, JSON.stringify(user));
          }
          this.updateAuthState(true, user, res.token);
          this.startRefreshTokenTimer(res.token);
          this.startInactivityTimer(res.token);
          console.log('🔄 Token atualizado');
        }),
        catchError(error => {
          console.error('❌ Erro ao atualizar token:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Obter token atual
   */
  getToken(): string | null {
    return this.authStateSubject.value.token || localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Obter usuário atual
   */
  getCurrentUser(): User | null {
    return this.authStateSubject.value.user;
  }

  /**
   * Verificar se está autenticado
   */
  isAuthenticated(): boolean {
    return this.authStateSubject.value.isAuthenticated;
  }

  /**
   * Verificar se token é válido
   */
  validateToken(): Observable<any> {
    const token = this.getToken();
    
    if (!token) {
      return throwError(() => new Error('Token não encontrado'));
    }

    return this.http.post(`${this.API_URL}/auth/validate`, { token })
      .pipe(
        catchError(error => {
          console.error('❌ Token inválido:', error);
          this.performLogout();
          return throwError(() => error);
        })
      );
  }

  /**
   * Obter dados do perfil do usuário
   */
  getProfile(): Observable<any> {
    return this.http.get(`${this.API_URL}/auth/me`)
      .pipe(
        catchError(error => {
          console.error('❌ Erro ao obter perfil:', error);
          if (error.status === 401) {
            this.performLogout();
          }
          return throwError(() => error);
        })
      );
  }

  /**
   * Registrar novo usuário (opcional)
   */
  register(userData: any): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/register`, userData, {
      headers: { 'x-api-key': this.API_KEY }
    })
      .pipe(
        catchError(error => {
          console.error('❌ Erro no registro:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Resetar senha do usuário através do email
   */
  resetPassword(email: string, password: string): Observable<any> {
    return this.http.post(`${this.API_URL}/auth/reset-password`, { email, password }, {
      headers: { 'x-api-key': this.API_KEY }
    })
      .pipe(
        catchError(error => {
          console.error('❌ Erro ao resetar senha:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Verificar se token está próximo do vencimento
   */
  isTokenExpiringSoon(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // Converter para milliseconds
      const now = Date.now();
      const timeUntilExpiry = exp - now;
      
      // Considerar "próximo do vencimento" se restam menos de 5 minutos
      return timeUntilExpiry < 5 * 60 * 1000;
    } catch (error) {
      console.error('Erro ao decodificar token:', error);
      return true;
    }
  }
}
