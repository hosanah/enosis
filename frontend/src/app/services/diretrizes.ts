/**
 * Serviço de Diretrizes
 * CRUD de diretrizes do sistema
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, catchError, throwError, map } from 'rxjs';

export interface Diretriz {
  id?: number;
  descricao: string;
  ativo: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DiretrizService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getDiretrizes(page = 1, limit = 10): Observable<{ data: Diretriz[]; total: number }> {
    return this.http.get<any>(`${this.API_URL}/diretrizes`, { params: { page, limit } }).pipe(
      map(res => ({
        data: res.data.map((d: any) => ({
          id: d.id,
          descricao: d.descricao,
          ativo: d.ativo
        } as Diretriz)),
        total: res.total
      })),
      catchError(error => {
        console.error('❌ Erro ao listar diretrizes:', error);
        return throwError(() => error);
      })
    );
  }

  getDiretriz(id: number): Observable<Diretriz> {
    return this.http.get<any>(`${this.API_URL}/diretrizes/${id}`).pipe(
      map(d => ({
        id: d.id,
        descricao: d.descricao,
        ativo: d.ativo
      } as Diretriz)),
      catchError(error => {
        console.error('❌ Erro ao obter diretriz:', error);
        return throwError(() => error);
      })
    );
  }

  createDiretriz(data: Diretriz): Observable<any> {
    return this.http.post(`${this.API_URL}/diretrizes`, data).pipe(
      catchError(error => {
        console.error('❌ Erro ao criar diretriz:', error);
        return throwError(() => error);
      })
    );
  }

  updateDiretriz(id: number, data: Partial<Diretriz>): Observable<any> {
    return this.http.put(`${this.API_URL}/diretrizes/${id}`, data).pipe(
      catchError(error => {
        console.error('❌ Erro ao atualizar diretriz:', error);
        return throwError(() => error);
      })
    );
  }

  deleteDiretriz(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/diretrizes/${id}`).pipe(
      catchError(error => {
        console.error('❌ Erro ao deletar diretriz:', error);
        return throwError(() => error);
      })
    );
  }
}
