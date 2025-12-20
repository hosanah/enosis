import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export type ReservaNatalFiltro = {
  dataCheckin?: Date | string | null;
  dataCheckout?: Date | string | null;
  nome?: string | null;
  coduh?: string | null;
  page?: number;
  size?: number;
};

@Injectable({ providedIn: 'root' })
export class ReservaNatalService {
  private readonly API = environment.apiUrl;
  constructor(private http: HttpClient) {}

  buscarReservas(filtro: ReservaNatalFiltro): Observable<{ data: any[]; total: number; page: number; size: number }>
  {
    let params = new HttpParams();
    const toYMD = (d: any) => {
      if (!d) return null;
      const dt = typeof d === 'string' ? new Date(d) : d as Date;
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    };

    const ck = toYMD(filtro.dataCheckin);
    const co = toYMD(filtro.dataCheckout);
    if (ck) params = params.set('checkin', ck);
    if (co) params = params.set('checkout', co);
    if (filtro.nome) params = params.set('nome', filtro.nome);
    if (filtro.coduh) params = params.set('coduh', filtro.coduh);
    if (filtro.page) params = params.set('page', filtro.page);
    if (filtro.size) params = params.set('size', filtro.size);

    return this.http.get<{ data: any[]; total: number; page: number; size: number }>(`${this.API}/natal/reservas`, { params });
  }

  getMesas() {
    return this.http.get<{ data: { idmarcacaomesa?: number; nummesa: number; ordem: number; ocupados: number; quantidadetotal: number }[] }>(`${this.API}/natal/mesas`);
  }

  getReservasPorMesa(idmarcacaomesa: number) {
    return this.http.get<{
      data: {
        idreservasfront: number;
        quantidade: number;
        numreserva?: string;
        coduh?: string;
        data_checkin?: string;
        data_checkout?: string;
        nome_hospede?: string;
        observacoes?: string | null;
      }[];
    }>(`${this.API}/natal/mesas/${idmarcacaomesa}/reservas`);
  }

  salvarMarcacao(payload: { idreservasfront: number; quantidade: number; idmarcacaomesa: number; observacao?: string }) {
    return this.http.post<{ ok: boolean; atualizados: number; solicitados: number }>(`${this.API}/natal/marcacoes`, payload);
  }

  cancelarMarcacao(payload: { idreservasfront: number; idmarcacaomesa: number }) {
    return this.http.post<{ ok: boolean; afetados: number }>(`${this.API}/natal/marcacoes/cancelar`, payload);
  }

  getMarcacoesPorReserva(idreservasfront: number) {
    return this.http.get<{
      data: {
        idreservasfront: number;
        idmarcacaomesa?: number;
        nummesa?: number;
        quantidade?: number;
        numreserva?: string;
        coduh?: string;
        nome_hospede?: string;
        observacoes?: string | null;
      }[];
    }>(`${this.API}/natal/marcacoes/reserva/${idreservasfront}`);
  }
}
