/**
 * Serviço para listar eventos e reservas e vincular ambos
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Reserva {
  id?: number;
  idreservacm?: number;
  numeroreservacm?: string;
  coduh?: string;
  nome_hospede?: string;
  contato?: string;
  email?: string;
  data_checkin?: string;
  data_checkout?: string;
  qtd_hospedes?: number;
}

export interface Evento {
  id?: number;
  nome?: string;
  restaurante?: string;
  data?: string;
}

export interface Disponibilidade {
  capacidade_total: number;
  ocupacao: number;
  vagas_restantes: number;
}

export interface Marcacao {
  id: number;
  evento_id: number;
  evento_nome: string;
  evento_data: string;
  restaurante: string;
  reserva_id: number;
  numero_reserva: string;
  nome_hospede: string;
  status: string;
  voucher?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReservaEventoService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /** Busca uma reserva válida pelo código da UH na data informada */
  buscarReservaValida(codigoUH: string, hoje: string): Observable<Reserva | null> {
    const params = { codigoUH, hoje };
    return this.http.get<Reserva | null>(`${this.API_URL}/reservas`, { params }).pipe(
      map(res => res || null),
      catchError(error => {
        console.error('❌ Erro ao buscar reserva:', error);
        return throwError(() => error);
      })
    );
  }

  /** Lista eventos disponíveis para a data */
  getEventosPorData(data: string): Observable<Evento[]> {
    return this.http.get<Evento[]>(`${this.API_URL}/eventos`, { params: { data } }).pipe(
      catchError(error => {
        console.error('❌ Erro ao listar eventos:', error);
        return throwError(() => error);
      })
    );
  }

  /** Obtém disponibilidade do evento */
  getDisponibilidade(eventoId: number): Observable<Disponibilidade> {
    return this.http.get<Disponibilidade>(`${this.API_URL}/eventos/${eventoId}/disponibilidade`).pipe(
      catchError(error => {
        console.error('❌ Erro ao consultar disponibilidade do evento:', error);
        return throwError(() => error);
      })
    );
  }

  /** Verifica marcações existentes para a reserva no evento */
  getMarcacoes(eventoId: number, reservaId: number): Observable<any[]> {
    return this.http
      .get<any[]>(`${this.API_URL}/eventos/${eventoId}/marcacoes`, { params: { reservaId } })
      .pipe(
        catchError(error => {
          console.error('❌ Erro ao obter marcações:', error);
          return throwError(() => error);
        })
      );
  }

  /** Obtém todas as marcações de uma reserva */
  getMarcacoesDaReserva(reservaId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/reservas/${reservaId}/marcacoes`).pipe(
      catchError(error => {
        console.error('❌ Erro ao obter marcações da reserva:', error);
        return throwError(() => error);
      })
    );
  }

  /** Baixa o voucher em PDF gerado pelo backend */
  downloadVoucher(reservaId: number, eventoId: number): Observable<Blob> {
    return this.http
      .get(`${this.API_URL}/eventos/${eventoId}/marcacoes/${reservaId}/voucher`, {
        responseType: 'blob'
      })
      .pipe(
        catchError(error => {
          console.error('❌ Erro ao obter voucher:', error);
          return throwError(() => error);
        })
      );
  }

  /** Realiza a marcação do evento */
  marcar(eventoId: number, payload: { reservaId: number; informacoes: string; quantidade: number }): Observable<any> {
    return this.http.post(`${this.API_URL}/eventos/${eventoId}/marcar`, payload).pipe(
      catchError(error => {
        console.error('❌ Erro ao salvar marcação:', error);
        return throwError(() => error);
      })
    );
  }

  /** Atualiza o status de uma marcação */
  atualizarStatus(eventoId: number, reservaId: number, status: string): Observable<any> {
    return this.http.patch(`${this.API_URL}/eventos/${eventoId}/marcacoes/${reservaId}/status`, { status }).pipe(
      catchError(error => {
        console.error('❌ Erro ao atualizar status:', error);
        return throwError(() => error);
      })
    );
  }
  /** Lista todas as marcações com detalhes de evento e reserva */
  getEventosReservas(): Observable<Marcacao[]> {
    return this.http.get<Marcacao[]>(`${this.API_URL}/eventos-reservas`).pipe(
      catchError(error => {
        console.error('❌ Erro ao listar marcações:', error);
        return throwError(() => error);
      })
    );
  }

  /** Atualiza o status da marcação */
  updateMarcacaoStatus(id: number, status: string): Observable<any> {
    return this.http.put(`${this.API_URL}/eventos-reservas/${id}`, { status }).pipe(
      catchError(error => {
        console.error('❌ Erro ao atualizar marcação:', error);
        return throwError(() => error);
      })
    );
  }
}

