import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface WhatsAppConfig {
  action: 'print' | 'send' | 'both';
  templates: { natal: string; anonovo: string };
  evolutionConfigured: boolean;
  instanceExists: boolean;
  instanceName: string | null;
  instanceStatus: string;
}

export interface ManagedWhatsAppInstance {
  exists: boolean;
  name: string | null;
  status: string;
  qrcode: string | null;
}

export interface WhatsAppSendLog {
  id: number;
  evento: string;
  hospede: string;
  telefone: string;
  reserva: string;
  status: 'pending' | 'success' | 'error';
  detalhe: string;
  messageId: string | null;
  createdAt: string;
}

export interface WhatsAppSendLogsPage {
  data: WhatsAppSendLog[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

@Injectable({ providedIn: 'root' })
export class WhatsAppService {
  private readonly api = `${environment.apiUrl}/whatsapp`;
  constructor(private http: HttpClient) {}
  getConfig() { return this.http.get<{ data: WhatsAppConfig }>(`${this.api}/config`); }
  saveConfig(config: Pick<WhatsAppConfig, 'action' | 'templates'>) { return this.http.put<{ data: WhatsAppConfig }>(`${this.api}/config`, config); }
  createInstance() { return this.http.post<{ data: ManagedWhatsAppInstance }>(`${this.api}/instance`, {}); }
  getInstanceStatus() { return this.http.get<{ data: ManagedWhatsAppInstance }>(`${this.api}/instance/status`); }
  deleteInstance() { return this.http.delete<{ ok: boolean; deleted: boolean }>(`${this.api}/instance`); }
  getSendLogs(page = 1, limit = 20) { return this.http.get<WhatsAppSendLogsPage>(`${this.api}/logs`, { params: { page, limit } }); }
  preview(payload: { evento: string; data: Record<string, any>; telefone: string }) {
    return this.http.post<{ data: { telefone: string; mensagem: string; voucher: string } }>(`${this.api}/preview`, payload);
  }
  send(payload: { evento: string; data: Record<string, any>; telefone: string }) {
    return this.http.post<{ ok: boolean; telefone: string; messageId: string | null; message: string }>(`${this.api}/send`, payload);
  }
}
