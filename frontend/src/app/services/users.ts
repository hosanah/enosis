/**
 * Serviço de Usuários
 * CRUD de usuários do sistema
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, catchError, throwError, map } from 'rxjs';

export interface AppUser {
  id?: number;
  username: string;
  email: string;
  fullName?: string;
  password?: string;
  is_active?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getUsers(page = 1, limit = 10): Observable<{ data: AppUser[]; total: number }> {
    return this.http.get<any>(`${this.API_URL}/users`, { params: { page, limit } }).pipe(
      map(res => ({
        data: res.data.map(({ fullName, is_active, ...user }: any) => ({
          ...user,
          fullName: fullName,
          is_active
        }) as AppUser),
        total: res.total
      })),
      catchError(error => {
        console.error('❌ Erro ao listar usuários:', error);
        return throwError(() => error);
      })
    );
  }

  getUser(id: number): Observable<AppUser> {
    return this.http.get<any>(`${this.API_URL}/users/${id}`).pipe(
      map(({ fullName, is_active, ...user }: any) => ({
        ...user,
        fullName: fullName,
        is_active
      }) as AppUser),
      catchError(error => {
        console.error('❌ Erro ao obter usuário:', error);
        return throwError(() => error);
      })
    );
  }

  createUser(data: AppUser): Observable<any> {
    return this.http.post(`${this.API_URL}/users`, data).pipe(
      catchError(error => {
        console.error('❌ Erro ao criar usuário:', error);
        return throwError(() => error);
      })
    );
  }

  updateUser(id: number, data: Partial<AppUser>): Observable<any> {
    const { password, ...payload } = data;
    return this.http.put(`${this.API_URL}/users/${id}`, payload).pipe(
      catchError(error => {
        console.error('❌ Erro ao atualizar usuário:', error);
        return throwError(() => error);
      })
    );
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/users/${id}`).pipe(
      catchError(error => {
        console.error('❌ Erro ao deletar usuário:', error);
        return throwError(() => error);
      })
    );
  }
}

