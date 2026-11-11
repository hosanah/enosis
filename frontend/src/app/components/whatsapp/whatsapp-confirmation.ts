import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { WhatsAppService, WhatsAppConfig } from '../../services/whatsapp.service';

@Component({ selector: 'app-whatsapp-confirmation', standalone: true, imports: [CommonModule, FormsModule, DialogModule, ButtonModule],
  template: `<p-dialog header="Confirmação da marcação" [(visible)]="visible" [modal]="true" [style]="{width:'min(760px, 96vw)'}" (onHide)="visibleChange.emit(false)">
    <div *ngIf="booking" class="booking"><div><small>HÓSPEDE</small><strong>{{booking['nome_hospede']}}</strong></div><div><small>APARTAMENTO</small><strong>{{booking['coduh']}}</strong></div><div><small>RESERVA</small><strong>{{booking['numreserva']}}</strong></div><div><small>MESA</small><strong>{{booking['nummesa']}}</strong></div></div>
    <label class="phone-label">WhatsApp do hóspede com DDI</label><input class="phone-input" [(ngModel)]="phone" (ngModelChange)="updatePhoneState()" placeholder="+55 (11) 99999-9999" />
    <div class="preview-grid"><section><h3>Mensagem</h3><pre>{{preview?.mensagem || 'Carregando prévia…'}}</pre></section><section><h3>Voucher</h3><pre>{{preview?.voucher}}</pre></section></div>
    <p *ngIf="phoneError" class="feedback error">{{phoneError}}</p><p *ngIf="previewError" class="feedback error">{{previewError}}</p><p *ngIf="feedback" class="feedback" [class.error]="sendError">{{feedback}}</p>
    <footer><button pButton class="p-button-outlined" label="Fechar" (click)="visible=false"></button><button *ngIf="config?.action==='print'" pButton label="Imprimir voucher" icon="pi pi-print" (click)="printRequested.emit(booking); visible=false"></button><button *ngIf="allowResend || config?.action==='send' || config?.action==='both'" pButton [label]="allowResend ? 'Reenviar WhatsApp' : (config?.action==='both' ? 'Enviar e imprimir' : 'Enviar WhatsApp')" [icon]="allowResend || config?.action!=='both' ? 'pi pi-whatsapp' : 'pi pi-check'" [loading]="sending" [disabled]="!preview || !phoneIsValid" (click)="send()"></button></footer>
  </p-dialog>`,
    styles: [`:host{font-family:inherit}.booking{display:grid;grid-template-columns:repeat(4,1fr);gap:.7rem;margin-bottom:1rem}.booking div{background:#f1f6f3;padding:.7rem;border-radius:9px;display:grid;gap:.3rem}.booking small{font-size:.65rem;color:#60736a;font-weight:700}.phone-label{display:block;font-weight:600;margin:.5rem 0}.phone-input{width:100%;box-sizing:border-box;border:1px solid #ced8d2;padding:.7rem;border-radius:8px;font:inherit}.preview-grid{display:grid;grid-template-columns:1fr 1fr;gap:.8rem;margin-top:1rem}.preview-grid section{background:#f7faf8;border:1px solid #e4ebe7;border-radius:10px;padding:.8rem;min-width:0}.preview-grid h3{font-size:.9rem;margin:0 0 .5rem}.preview-grid pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;font-size:.82rem;margin:0;color:#33433a;max-height:230px;overflow:auto}.preview-grid section:first-child pre{background:#fff;padding:.7rem;border-radius:8px}.feedback{color:#13794e}.feedback.error{color:#b42318}footer{display:flex;justify-content:flex-end;gap:.6rem;margin-top:1rem}@media(max-width:580px){.booking{grid-template-columns:1fr 1fr}.preview-grid{grid-template-columns:1fr}}`]
})
export class WhatsAppConfirmationComponent implements OnChanges {
  @Input() visible = false;
  @Input() evento: 'natal' | 'anonovo' = 'natal';
  @Input() booking: Record<string, any> | null = null;
  @Input() allowResend = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() printRequested = new EventEmitter<any>();
  config: WhatsAppConfig | null = null;
  phone = '';
  preview: { telefone: string; mensagem: string; voucher: string } | null = null;
  sending = false;
  feedback = '';
  sendError = false;
  previewError = '';
  phoneError = '';
  phoneIsValid = false;
  private previewTimer: ReturnType<typeof setTimeout> | null = null;
  constructor(private whatsapp: WhatsAppService) {}
  ngOnChanges(changes: SimpleChanges) { if (changes['visible']?.currentValue && this.booking) this.open(); }
  private open() { this.phone = this.booking?.['telefone'] || ''; this.preview = null; this.feedback = ''; this.previewError = ''; this.updatePhoneState(); this.whatsapp.getConfig().subscribe(({ data }) => { this.config = data; this.loadPreview(); }); }
  updatePhoneState() {
    const digits = this.phone.replace(/\D/g, '').replace(/^00/, '');
    const internationalDigits = digits.startsWith('55') ? digits : `55${digits}`;
    this.phoneIsValid = internationalDigits.length >= 12 && internationalDigits.length <= 15;
    this.phoneError = this.phoneIsValid ? '' : (this.phone ? 'Informe um telefone completo com DDD e DDI para enviar.' : 'Informe o WhatsApp do hóspede para enviar.');
  }
  loadPreview() {
    if (this.previewTimer) clearTimeout(this.previewTimer);
    this.preview = null;
    this.previewError = '';
    if (!this.booking || !this.config) return;
    this.previewTimer = setTimeout(() => {
      this.whatsapp.preview({ evento: this.evento, data: this.booking!, telefone: this.booking?.['telefone'] || '' }).subscribe({
        next: ({ data }) => { this.preview = data; this.previewError = ''; },
        error: error => { this.preview = null; this.previewError = error?.error?.error || 'Não foi possível preparar a prévia para este telefone.'; }
      });
    }, 250);
  }
  send() { if (!this.booking || !this.preview) return; this.sending = true; this.feedback = ''; this.sendError = false; if (!this.allowResend && this.config?.action === 'both') this.printRequested.emit(this.booking); this.whatsapp.send({ evento: this.evento, data: this.booking, telefone: this.phone }).subscribe({ next: ({ message }) => { this.sending = false; this.feedback = message || `Mensagem enviada para ${this.preview?.telefone}.`; }, error: error => { this.sending = false; this.sendError = true; this.feedback = error?.error?.error || 'Falha ao enviar pela Evolution API.'; } }); }
}
