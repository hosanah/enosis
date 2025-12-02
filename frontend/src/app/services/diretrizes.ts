/**
 * Serviço de Diretrizes
 * Lista e atualiza (habilita/desabilita) diretrizes de validação
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, catchError, throwError, map } from 'rxjs';

export interface Diretriz {
  code: string;
  nome: string;
  descricao?: string;
  valor?: string;
  habilitado: number | boolean;
}

@Injectable({ providedIn: 'root' })
export class DiretrizesService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  listar(): Observable<Diretriz[]> {
    return this.http.get<{ data: Diretriz[] }>(`${this.API_URL}/diretrizes`).pipe(
      map(res => res.data || []),
      catchError(err => {
        console.error('Erro ao listar diretrizes:', err);
        return throwError(() => err);
      })
    );
  }

  atualizar(code: string, habilitado: boolean): Observable<Diretriz> {
    return this.http.patch<{ data: Diretriz }>(`${this.API_URL}/diretrizes/${code}`, { habilitado }).pipe(
      map(res => res.data),
      catchError(err => {
        console.error('Erro ao atualizar diretriz:', err);
        return throwError(() => err);
      })
    );
  }
}

