/**
 * Serviço de API
 * Gerencia comunicação com o backend
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, catchError, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Obter dados do dashboard
   */
  getDashboardData(): Observable<any> {
    return this.http.get(`${this.API_URL}/dashboard`)
      .pipe(
        catchError(error => {
          console.error('❌ Erro ao obter dados do dashboard:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Obter estatísticas detalhadas
   */
  getStats(): Observable<any> {
    return this.http.get(`${this.API_URL}/dashboard/stats`)
      .pipe(
        catchError(error => {
          console.error('❌ Erro ao obter estatísticas:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Obter perfil do usuário
   */
  getUserProfile(): Observable<any> {
    return this.http.get(`${this.API_URL}/dashboard/profile`)
      .pipe(
        catchError(error => {
          console.error('❌ Erro ao obter perfil:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Atualizar perfil do usuário
   */
  updateUserProfile(profileData: any): Observable<any> {
    return this.http.put(`${this.API_URL}/dashboard/profile`, profileData)
      .pipe(
        catchError(error => {
          console.error('❌ Erro ao atualizar perfil:', error);
          return throwError(() => error);
        })
      );
  }
}
