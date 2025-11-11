/**
 * Serviço de Reservas
 * CRUD de reservas do sistema
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, catchError, throwError, map } from 'rxjs';

export interface Reserva {
  id?: number;
  idreservacm: number;
  numeroreservacm: string;
  coduh: string;
  nome_hospede: string;
  contato: string;
  email: string;
  data_checkin: string;
  data_checkout: string;
  qtd_hospedes: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReservaService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getReservas(page = 1, limit = 10): Observable<{ data: Reserva[]; total: number }> {
    return this.http.get<any>(`${this.API_URL}/reservas`, { params: { page, limit } }).pipe(
      map(res => ({ data: res.data as Reserva[], total: res.total })),
      catchError(error => {
        console.error('❌ Erro ao listar reservas:', error);
        return throwError(() => error);
      })
    );
  }

  getReserva(id: number): Observable<Reserva> {
    return this.http.get<Reserva>(`${this.API_URL}/reservas/${id}`).pipe(
      catchError(error => {
        console.error('❌ Erro ao obter reserva:', error);
        return throwError(() => error);
      })
    );
  }

  createReserva(data: Reserva): Observable<any> {
    return this.http.post(`${this.API_URL}/reservas`, data).pipe(
      catchError(error => {
        console.error('❌ Erro ao criar reserva:', error);
        return throwError(() => error);
      })
    );
  }

  updateReserva(id: number, data: Partial<Reserva>): Observable<any> {
    return this.http.put(`${this.API_URL}/reservas/${id}`, data).pipe(
      catchError(error => {
        console.error('❌ Erro ao atualizar reserva:', error);
        return throwError(() => error);
      })
    );
  }

  deleteReserva(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/reservas/${id}`).pipe(
      catchError(error => {
        console.error('❌ Erro ao deletar reserva:', error);
        return throwError(() => error);
      })
    );
  }
}
