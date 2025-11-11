/**
 * Serviço de Eventos
 * CRUD de eventos do sistema
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, catchError, throwError, map } from 'rxjs';

export interface Evento {
  id?: number;
  nome: string;
  data: string;
  hora: string;
  restauranteId: number;
  restaurante?: string;
}

export interface EventoMassa {
  nome: string;
  hora: string;
  restauranteId: number;
  dataInicio: string;
  dataFim: string;
}

function toIsoDate(date: string): string {
  return new Date(date).toISOString().split('T')[0];
}

@Injectable({
  providedIn: 'root'
})
export class EventoService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getEventos(page = 1, limit = 10): Observable<{ data: Evento[]; total: number }> {
    return this.http.get<any>(`${this.API_URL}/eventos`, { params: { page, limit } }).pipe(
      map(res => ({
        data: res.data.map((e: any) => ({
          id: e.id,
          nome: e.nome,
          data: toIsoDate(e.data),
          hora: e.hora,
          restauranteId: e.restaurante_id,
          restaurante: e.restaurante
        } as Evento)),
        total: res.total
      })),
      catchError(error => {
        console.error('❌ Erro ao listar eventos:', error);
        return throwError(() => error);
      })
    );
  }

  getEvento(id: number): Observable<Evento> {
    return this.http.get<any>(`${this.API_URL}/eventos/${id}`).pipe(
      map(e => ({
        id: e.id,
        nome: e.nome,
        data: toIsoDate(e.data),
        hora: e.hora,
        restauranteId: e.restaurante_id,
        restaurante: e.restaurante
      } as Evento)),
      catchError(error => {
        console.error('❌ Erro ao obter evento:', error);
        return throwError(() => error);
      })
    );
  }

  createEvento(data: Evento): Observable<any> {
    return this.http.post(`${this.API_URL}/eventos`, data).pipe(
      catchError(error => {
        console.error('❌ Erro ao criar evento:', error);
        return throwError(() => error);
      })
    );
  }

  createEventosEmMassa(data: EventoMassa): Observable<any> {
    return this.http.post(`${this.API_URL}/eventos/em-massa`, data).pipe(
      catchError(error => {
        console.error('❌ Erro ao criar eventos em massa:', error);
        return throwError(() => error);
      })
    );
  }

  updateEvento(id: number, data: Partial<Evento>): Observable<any> {
    return this.http.put(`${this.API_URL}/eventos/${id}`, data).pipe(
      catchError(error => {
        console.error('❌ Erro ao atualizar evento:', error);
        return throwError(() => error);
      })
    );
  }

  deleteEvento(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/eventos/${id}`).pipe(
      catchError(error => {
        console.error('❌ Erro ao deletar evento:', error);
        return throwError(() => error);
      })
    );
  }
}
