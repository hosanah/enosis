/**
 * Serviço de Reservas
 * CRUD de reservas do sistema
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, catchError, throwError } from 'rxjs';
import { Reserva } from '../models/reserva';

@Injectable({
  providedIn: 'root'
})
export class ReservaService {
  private readonly API_URL = `${environment.apiUrl}/reservas`;

  constructor(private http: HttpClient) {}

  getReservas(): Observable<Reserva[]> {
    return this.http.get<Reserva[]>(this.API_URL).pipe(
      catchError(error => {
        console.error('❌ Erro ao listar reservas:', error);
        return throwError(() => error);
      })
    );
  }

  getReserva(id: number): Observable<Reserva> {
    return this.http.get<Reserva>(`${this.API_URL}/${id}`).pipe(
      catchError(error => {
        console.error('❌ Erro ao obter reserva:', error);
        return throwError(() => error);
      })
    );
  }

  createReserva(data: Reserva): Observable<Reserva> {
    return this.http.post<Reserva>(this.API_URL, data).pipe(
      catchError(error => {
        console.error('❌ Erro ao criar reserva:', error);
        return throwError(() => error);
      })
    );
  }

  updateReserva(id: number, data: Partial<Reserva>): Observable<Reserva> {
    return this.http.put<Reserva>(`${this.API_URL}/${id}`, data).pipe(
      catchError(error => {
        console.error('❌ Erro ao atualizar reserva:', error);
        return throwError(() => error);
      })
    );
  }

  deleteReserva(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/${id}`).pipe(
      catchError(error => {
        console.error('❌ Erro ao deletar reserva:', error);
        return throwError(() => error);
      })
    );
  }
}
