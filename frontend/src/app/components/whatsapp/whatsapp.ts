import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { WhatsAppConfig, WhatsAppSendLog, WhatsAppService } from '../../services/whatsapp.service';

@Component({
  selector: 'app-whatsapp', standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule],
  template: `
    
    <main class="wa-page">
      <header><div><span class="eyebrow">COMUNICAÇÃO COM HÓSPEDES</span><h1>WhatsApp das reservas</h1><p>Edite as mensagens e confira o voucher que acompanha a confirmação.</p></div></header>
      <section class="wa-settings">
        <div class="api-state" [class.ready]="config.evolutionConfigured"><i class="pi pi-circle-fill"></i>{{config.evolutionConfigured ? 'Evolution API configurada' : 'Evolution API aguardando configuração no backend/.env'}}</div>
      </section>
      <section class="wa-instance">
        <div class="instance-copy"><span class="eyebrow">CONEXÃO</span><h2>Instância WhatsApp</h2><p *ngIf="!config.instanceExists">Ainda não existe uma instância criada por este sistema.</p><p *ngIf="config.instanceExists"><strong>{{config.instanceName}}</strong> · Status: {{statusLabel(config.instanceStatus)}}</p></div>
        <div class="instance-actions"><button *ngIf="config.evolutionConfigured && !config.instanceExists" pButton label="Criar instância" icon="pi pi-plus" (click)="createInstance()" [loading]="managingInstance"></button><button *ngIf="config.instanceExists" pButton class="p-button-outlined" label="Consultar status" icon="pi pi-refresh" (click)="refreshInstance()" [loading]="managingInstance"></button><button *ngIf="config.instanceExists" pButton class="p-button-danger p-button-outlined" label="Apagar instância" icon="pi pi-trash" (click)="deleteInstance()" [loading]="managingInstance"></button></div>
        <div *ngIf="qrCode" class="qr-panel"><img [src]="qrCode" alt="QR code para conectar o WhatsApp"><span>Escaneie este QR code pelo WhatsApp para conectar a instância.</span></div>
      </section>
      <section class="wa-tabs"><button *ngFor="let event of events" [class.active]="selected===event.key" (click)="selectTab(event.key)">{{event.label}}</button></section>
      <section class="wa-grid" *ngIf="selected !== 'logs'">
        <article class="wa-editor"><h2>Template de {{selectedLabel}}</h2><p>Use os campos entre chaves para inserir os dados do PMS e da marcação.</p>
          <div class="tokens"><span *ngFor="let token of tokens">{{token}}</span></div>
          <textarea [(ngModel)]="config.templates[selectedEvent]" rows="8" (ngModelChange)="savePreview()"></textarea>
          <button pButton label="Salvar template" icon="pi pi-check" (click)="save()" [loading]="saving"></button>
        </article>
        <article class="wa-preview"><h2>Prévia do envio</h2>
          <div class="phone"><div class="phone-head"><i class="pi pi-whatsapp"></i> Enotel · WhatsApp</div><div class="bubble">{{messagePreview}}</div></div>
          <section class="voucher-card" aria-label="Prévia do voucher">
            <header class="voucher-brand"><img src="/logotipo.png" alt="Logo Enotel"><div><small>CELEBRAÇÃO {{selectedLabel.toUpperCase()}}</small><strong>VOUCHER DE RESERVA</strong></div></header>
            <p class="voucher-message">{{voucherMessage}}</p>
            <div class="voucher-fields">
              <div><small>HÓSPEDE</small><strong>Maria da Silva</strong></div>
              <div><small>APARTAMENTO</small><strong>B-203</strong></div>
              <div><small>RESERVA</small><strong>123456</strong></div>
              <div><small>MESA</small><strong>24</strong></div>
              <div><small>QUANTIDADE DE PESSOAS</small><strong>4</strong></div>
            </div>
            <footer>Apresente este voucher no local da celebração.<strong>{{selected === 'natal' ? 'Desejamos um Feliz Natal!' : 'Feliz Ano-Novo!'}}</strong></footer>
          </section>
        </article>
      </section>
      <section class="wa-logs" *ngIf="selected === 'logs'">
        <header><div><h2>Histórico de envios</h2><p>Retorno dos envios de WhatsApp, com status e detalhe.</p></div>
          <button pButton class="p-button-outlined" label="Atualizar" icon="pi pi-refresh" (click)="loadSendLogs()" [loading]="logsLoading"></button>
        </header>
        <p *ngIf="logsError" class="logs-error">{{logsError}}</p>
        <div *ngIf="logsLoading && !sendLogs.length" class="logs-empty">Carregando histórico…</div>
        <div *ngIf="!logsLoading && !sendLogs.length && !logsError" class="logs-empty">Nenhum envio registrado.</div>
        <div class="send-log-list">
          <article class="send-log" *ngFor="let log of sendLogs">
            <div class="send-log-head"><div class="send-log-contact"><strong>{{log.hospede || 'Hóspede sem nome'}}</strong><span>{{eventLabel(log.evento)}} · {{log.telefone || 'Número não informado'}}</span></div>
              <div class="send-log-meta"><span class="log-status" [ngClass]="'status-' + log.status">{{logStatusLabel(log.status)}}</span><time>{{log.createdAt | date:'dd/MM/yyyy HH:mm:ss'}}</time></div>
            </div>
            <p>{{log.detalhe}}</p>
            <small *ngIf="log.reserva">Reserva {{log.reserva}}</small>
          </article>
        </div>
        <footer class="logs-pagination" *ngIf="logsTotal > 0">
          <span>{{logsTotal}} envio(s) · Página {{logsPage}} de {{logsTotalPages}}</span>
          <div><button pButton class="p-button-outlined p-button-sm" label="Anterior" icon="pi pi-chevron-left" (click)="loadSendLogs(logsPage - 1)" [disabled]="logsLoading || logsPage <= 1"></button>
            <button pButton class="p-button-outlined p-button-sm" label="Próxima" icon="pi pi-chevron-right" iconPos="right" (click)="loadSendLogs(logsPage + 1)" [disabled]="logsLoading || logsPage >= logsTotalPages"></button></div>
        </footer>
      </section>
    </main>
  `,
  styles: [`
    .wa-page{max-width:1180px;margin:auto;padding:1.5rem;color:#17211d}.wa-page header{display:flex;justify-content:space-between;margin-bottom:1.5rem}.eyebrow{font-size:.72rem;font-weight:700;letter-spacing:.12em;color:#16865b}.wa-page h1{margin:.35rem 0;font-size:2rem}.wa-page p{color:#65716c;margin:.4rem 0}.wa-settings,.wa-editor,.wa-preview,.wa-instance{background:#fff;border:1px solid #e3eae6;border-radius:16px;padding:1.25rem;box-shadow:0 8px 28px #153d2810}.wa-settings{display:flex;align-items:end;gap:1.25rem;flex-wrap:wrap;margin-bottom:1rem}.wa-settings label{display:grid;gap:.5rem;font-weight:600}.wa-settings select,.wa-editor textarea{border:1px solid #ccd7d1;border-radius:9px;padding:.75rem;font:inherit}.api-state{margin-left:auto;color:#a66b12;font-size:.9rem}.api-state.ready{color:#16865b}.api-state i{font-size:.5rem;margin-right:.5rem}.wa-instance{display:grid;grid-template-columns:1fr auto;align-items:center;gap:1rem;margin-bottom:1rem}.wa-instance h2{margin:.3rem 0}.instance-actions{display:flex;gap:.6rem;flex-wrap:wrap}.qr-panel{grid-column:1/-1;display:flex;align-items:center;gap:1rem;background:#f2f8f4;padding:1rem;border-radius:12px}.qr-panel img{width:180px;height:180px;object-fit:contain;background:white}.qr-panel span{color:#52625a}.wa-tabs{display:flex;gap:.5rem;margin:1.25rem 0}.wa-tabs button{border:0;background:#eaf1ed;padding:.7rem 1.1rem;border-radius:9px;cursor:pointer}.wa-tabs .active{background:#16865b;color:#fff}.wa-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:1rem}.wa-editor h2,.wa-preview h2{margin:.1rem 0 .6rem}.tokens{display:flex;gap:.4rem;flex-wrap:wrap;margin:1rem 0}.tokens span{background:#eaf4ee;color:#18714d;padding:.3rem .55rem;border-radius:20px;font-size:.82rem}.wa-editor textarea{box-sizing:border-box;width:100%;resize:vertical;margin-bottom:1rem}.phone{max-width:390px;margin:1rem auto;background:#e8eee9;border-radius:16px;padding:12px;min-height:210px}.phone-head{color:#15804f;padding:.5rem;font-weight:600}.bubble{white-space:pre-wrap;background:#fff;border-radius:4px 14px 14px;padding:1rem;line-height:1.5;box-shadow:0 1px 2px #0002}.bubble pre{white-space:pre-wrap;font:inherit;font-size:.85rem;color:#52625a}.bubble hr{border:0;border-top:1px solid #e5ebe7;margin:1rem 0}@media(max-width:800px){.wa-grid{grid-template-columns:1fr}.wa-instance{grid-template-columns:1fr}.api-state{margin-left:0}}
  `, `
    .voucher-card{max-width:390px;margin:1rem auto 0;padding:1.2rem;border:1px solid #d6e4da;border-radius:14px;background:linear-gradient(145deg,#fff 0%,#f3faf5 100%);box-shadow:0 8px 22px #153d2812}
    .voucher-brand{display:flex;align-items:center;gap:.8rem;padding-bottom:.9rem;border-bottom:1px solid #dce9df}
    .voucher-brand img{width:108px;height:auto;object-fit:contain}
    .voucher-brand div{display:grid;gap:.25rem}
    .voucher-brand small,.voucher-fields small{font-size:.62rem;letter-spacing:.08em;color:#16865b;font-weight:700}
    .voucher-brand strong{font-size:.85rem;color:#263a2e}
    .voucher-message{font-size:.84rem;line-height:1.5;color:#52625a;margin:.9rem 0!important}
    .voucher-fields{display:grid;grid-template-columns:1fr 1fr;gap:.65rem}
    .voucher-fields div{display:grid;gap:.22rem;background:#fff;border:1px solid #e5eee7;border-radius:8px;padding:.65rem}
    .voucher-fields strong{font-size:.86rem;color:#263a2e;overflow-wrap:anywhere}
    .voucher-card footer{display:grid;gap:.35rem;margin-top:.8rem;padding-top:.7rem;border-top:1px dashed #c5d8c9;font-size:.72rem;color:#60736a}
    .voucher-card footer strong{font-size:.85rem;color:#16865b}
  `, `
    .wa-logs{margin-top:1rem;background:#fff;border:1px solid #e3eae6;border-radius:16px;padding:1.25rem;box-shadow:0 8px 28px #153d2810}
    .wa-logs>header{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:.8rem}
    .wa-logs h2{margin:.1rem 0 .35rem;font-size:1.1rem}.wa-logs>header p{margin:0}
    .logs-empty{padding:1.2rem;text-align:center;color:#65716c;background:#f7faf8;border-radius:10px}
    .logs-error{color:#b42318}.send-log-list{display:grid;gap:.65rem}
    .send-log{padding:.9rem 1rem;border:1px solid #e5eee7;border-radius:10px;background:#fbfdfb}
    .send-log-head{display:flex;justify-content:space-between;align-items:center;gap:1rem}.send-log-contact{display:grid;gap:.25rem}.send-log-contact strong{color:#263a2e}.send-log-contact span,.send-log-meta time,.send-log small{font-size:.78rem;color:#65716c}
    .send-log-meta{display:flex;align-items:center;gap:.7rem;flex-wrap:wrap}.log-status{padding:.28rem .55rem;border-radius:20px;font-size:.72rem;font-weight:700}.status-success{background:#e6f6ed;color:#13794e}.status-error{background:#fdecec;color:#b42318}.status-pending{background:#fff4d6;color:#936400}
    .send-log>p{margin:.55rem 0 .25rem!important;color:#384840}.send-log small{display:block}
    .logs-pagination{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-top:1rem;padding-top:.8rem;border-top:1px solid #e5eee7;color:#65716c;font-size:.82rem}.logs-pagination>div{display:flex;gap:.5rem}
    @media(max-width:650px){.wa-logs>header,.send-log-head{align-items:flex-start;flex-direction:column}.send-log-meta{justify-content:flex-start}.logs-pagination{align-items:flex-start;flex-direction:column}}
  `]
})
export class WhatsAppComponent implements OnInit {
  config: WhatsAppConfig = { action: 'print', templates: { natal: '', anonovo: '' }, evolutionConfigured: false, instanceExists: false, instanceName: null, instanceStatus: 'not_created' };
  events = [{ key: 'natal' as const, label: 'Natal' }, { key: 'anonovo' as const, label: 'Ano-Novo' }, { key: 'logs' as const, label: 'Histórico de envios' }];
  selected: 'natal' | 'anonovo' | 'logs' = 'natal';
  tokens = ['{{hospede}}', '{{mesa}}', '{{apartamento}}', '{{quantidade}}', '{{reserva}}'];
  saving = false;
  managingInstance = false;
  qrCode: string | null = null;
  sendLogs: WhatsAppSendLog[] = [];
  logsLoading = false;
  logsError = '';
  logsPage = 1;
  logsPageSize = 20;
  logsTotal = 0;
  logsTotalPages = 0;
  constructor(private whatsapp: WhatsAppService, private messages: MessageService) {}
  ngOnInit() { this.whatsapp.getConfig().subscribe({ next: ({ data }) => { this.config = data; if (data.instanceExists) this.refreshInstance(); }, error: () => this.messages.add({ severity: 'error', summary: 'WhatsApp', detail: 'Não foi possível carregar a configuração.' }) }); }
  selectTab(tab: 'natal' | 'anonovo' | 'logs') { this.selected = tab; if (tab === 'logs' && !this.sendLogs.length && !this.logsTotal) this.loadSendLogs(1); }
  loadSendLogs(page = this.logsPage) { this.logsLoading = true; this.logsError = ''; this.whatsapp.getSendLogs(page, this.logsPageSize).subscribe({ next: ({ data, pagination }) => { this.sendLogs = data; this.logsPage = pagination.page; this.logsTotal = pagination.total; this.logsTotalPages = pagination.totalPages; }, error: () => { this.logsError = 'Não foi possível carregar o histórico de envios.'; this.logsLoading = false; }, complete: () => this.logsLoading = false }); }
  get selectedEvent(): 'natal' | 'anonovo' { return this.selected === 'anonovo' ? 'anonovo' : 'natal'; }
  logStatusLabel(status: WhatsAppSendLog['status']) { return status === 'success' ? 'Enviado com sucesso' : status === 'error' ? 'Erro no envio' : 'Em andamento'; }
  eventLabel(evento: string) { return evento === 'natal' ? 'Natal' : evento === 'anonovo' ? 'Ano-Novo' : evento; }
  get selectedLabel() { return this.selected === 'anonovo' ? 'Ano-Novo' : 'Natal'; }
  get messagePreview() { return (this.config.templates[this.selectedEvent] || '').replace(/{{\s*(\w+)\s*}}/g, (_m, key) => ({ hospede: 'Maria da Silva', mesa: '24', apartamento: 'B-203', quantidade: '4', reserva: '123456' } as any)[key] ?? `{{${key}}}`); }
  get voucherMessage() { return this.selectedEvent === 'natal' ? 'Uma noite especial, repleta de encanto, alegria e momentos inesquecíveis espera por você e sua família.' : 'Uma celebração inesquecível para receber o novo ano com alegria, boas energias e momentos especiais.'; }
  get voucherPreview() { return `VOUCHER ${this.selectedLabel.toUpperCase()}\nHóspede: Maria da Silva\nApartamento: B-203\nReserva: 123456\nMesa: 24\nPessoas: 4`; }
  savePreview() {}
  statusLabel(status: string) { return ({ open: 'Conectado', connecting: 'Conectando', close: 'Desconectado', created: 'Aguardando conexão', creating: 'Criando', not_created: 'Não criada' } as Record<string, string>)[status] || status; }
  createInstance() { this.managingInstance = true; this.whatsapp.createInstance().subscribe({ next: ({ data }) => { this.config.instanceExists = true; this.config.instanceName = data.name; this.config.instanceStatus = data.status; this.qrCode = data.qrcode; this.messages.add({ severity: 'success', summary: 'WhatsApp', detail: 'Instância criada. Escaneie o QR code para conectar.' }); }, error: error => this.messages.add({ severity: 'error', summary: 'WhatsApp', detail: error?.error?.error || 'Não foi possível criar a instância.' }), complete: () => this.managingInstance = false }); }
  refreshInstance() { this.managingInstance = true; this.whatsapp.getInstanceStatus().subscribe({ next: ({ data }) => { this.config.instanceExists = data.exists; this.config.instanceName = data.name; this.config.instanceStatus = data.status; this.qrCode = data.qrcode; }, error: error => this.messages.add({ severity: 'error', summary: 'WhatsApp', detail: error?.error?.error || 'Não foi possível consultar o status.' }), complete: () => this.managingInstance = false }); }
  deleteInstance() { if (!window.confirm('Apagar definitivamente a única instância WhatsApp gerenciada por este sistema?')) return; this.managingInstance = true; this.whatsapp.deleteInstance().subscribe({ next: () => { this.config.instanceExists = false; this.config.instanceName = null; this.config.instanceStatus = 'not_created'; this.qrCode = null; this.messages.add({ severity: 'success', summary: 'WhatsApp', detail: 'Instância apagada.' }); }, error: error => this.messages.add({ severity: 'error', summary: 'WhatsApp', detail: error?.error?.error || 'Não foi possível apagar a instância.' }), complete: () => this.managingInstance = false }); }
  save() { this.saving = true; this.whatsapp.saveConfig({ action: this.config.action, templates: this.config.templates }).subscribe({ next: ({ data }) => { this.config = { ...this.config, ...data }; this.messages.add({ severity: 'success', summary: 'Salvo', detail: 'Configuração e templates atualizados.' }); }, error: error => this.messages.add({ severity: 'error', summary: 'WhatsApp', detail: error?.error?.error || 'Não foi possível salvar.' }), complete: () => this.saving = false }); }
}
