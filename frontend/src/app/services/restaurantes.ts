/**
 * Serviço de Restaurantes
 * CRUD de restaurantes do sistema
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, catchError, throwError, map } from 'rxjs';

export interface Restaurante {
  id?: number;
  nome: string;
  capacidade: number;
  descricao?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RestauranteService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getRestaurantes(page = 1, limit = 10): Observable<{ data: Restaurante[]; total: number }> {
    return this.http.get<any>(`${this.API_URL}/restaurantes`, { params: { page, limit } }).pipe(
      map(res => ({
        data: res.data.map((r: any) => ({
          id: r.id,
          nome: r.nome,
          capacidade: r.capacidade,
          descricao: r.descricao
        } as Restaurante)),
        total: res.total
      })),
      catchError(error => {
        console.error('❌ Erro ao listar restaurantes:', error);
        return throwError(() => error);
      })
    );
  }

  getRestaurante(id: number): Observable<Restaurante> {
    return this.http.get<any>(`${this.API_URL}/restaurantes/${id}`).pipe(
      map(r => ({
        id: r.id,
        nome: r.nome,
        capacidade: r.capacidade,
        descricao: r.descricao
      } as Restaurante)),
      catchError(error => {
        console.error('❌ Erro ao obter restaurante:', error);
        return throwError(() => error);
      })
    );
  }

  createRestaurante(data: Restaurante): Observable<any> {
    const payload = {
      nome: data.nome,
      capacidade: data.capacidade,
      descricao: data.descricao
    };
    return this.http.post(`${this.API_URL}/restaurantes`, payload).pipe(
      catchError(error => {
        console.error('❌ Erro ao criar restaurante:', error);
        return throwError(() => error);
      })
    );
  }

  updateRestaurante(id: number, data: Partial<Restaurante>): Observable<any> {
    const payload: any = { ...data };
    return this.http.put(`${this.API_URL}/restaurantes/${id}`, payload).pipe(
      catchError(error => {
        console.error('❌ Erro ao atualizar restaurante:', error);
        return throwError(() => error);
      })
    );
  }

  deleteRestaurante(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/restaurantes/${id}`).pipe(
      catchError(error => {
        console.error('❌ Erro ao deletar restaurante:', error);
        return throwError(() => error);
      })
    );
  }
}
