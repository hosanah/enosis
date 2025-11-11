/**
 * Serviço de Eventos
 * CRUD de eventos do sistema
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, catchError, throwError } from 'rxjs';
import { Evento } from '../models/evento';

@Injectable({
  providedIn: 'root'
})
export class EventoService {
  private readonly API_URL = `${environment.apiUrl}/eventos`;

  constructor(private http: HttpClient) {}

  getEventos(): Observable<Evento[]> {
    return this.http.get<Evento[]>(this.API_URL).pipe(
      catchError(error => {
        console.error('❌ Erro ao listar eventos:', error);
        return throwError(() => error);
      })
    );
  }

  getEvento(id: number): Observable<Evento> {
    return this.http.get<Evento>(`${this.API_URL}/${id}`).pipe(
      catchError(error => {
        console.error('❌ Erro ao obter evento:', error);
        return throwError(() => error);
      })
    );
  }

  createEvento(data: Evento): Observable<Evento> {
    return this.http.post<Evento>(this.API_URL, data).pipe(
      catchError(error => {
        console.error('❌ Erro ao criar evento:', error);
        return throwError(() => error);
      })
    );
  }

  updateEvento(id: number, data: Partial<Evento>): Observable<Evento> {
    return this.http.put<Evento>(`${this.API_URL}/${id}`, data).pipe(
      catchError(error => {
        console.error('❌ Erro ao atualizar evento:', error);
        return throwError(() => error);
      })
    );
  }

  deleteEvento(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/${id}`).pipe(
      catchError(error => {
        console.error('❌ Erro ao deletar evento:', error);
        return throwError(() => error);
      })
    );
  }
}
