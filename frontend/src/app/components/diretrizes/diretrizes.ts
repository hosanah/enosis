/**
 * Diretrizes
 * Tela para habilitar/desabilitar validações de reserva de mesa
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { MessageService } from 'primeng/api';

import { Diretriz, DiretrizesService } from '../../services/diretrizes';
import { WhatsAppConfig, WhatsAppService } from '../../services/whatsapp.service';

@Component({
  selector: 'app-diretrizes',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, CardModule, ToggleSwitch],
  templateUrl: './diretrizes.html',
  styleUrls: ['./diretrizes.scss']
})
export class DiretrizesComponent implements OnInit {
  diretrizes: Diretriz[] = [];
  loading = false;
  whatsappConfig: WhatsAppConfig | null = null;
  savingWhatsAppAction = false;

  constructor(private svc: DiretrizesService, private message: MessageService, private whatsapp: WhatsAppService) {}

  ngOnInit(): void {
    this.carregar();
    this.carregarAcaoWhatsApp();
  }

  carregarAcaoWhatsApp(): void {
    this.whatsapp.getConfig().subscribe(({ data }) => this.whatsappConfig = data);
  }

  salvarAcaoWhatsApp(): void {
    if (!this.whatsappConfig) return;
    this.savingWhatsAppAction = true;
    this.whatsapp.saveConfig({ action: this.whatsappConfig.action, templates: this.whatsappConfig.templates }).subscribe({
      next: ({ data }) => {
        this.whatsappConfig = data;
        this.message.add({ severity: 'success', summary: 'Sucesso', detail: 'Ação ao concluir a marcação atualizada.' });
      },
      complete: () => this.savingWhatsAppAction = false
    });
  }

  carregar(): void {
    this.loading = true;
    this.svc.listar().subscribe({
      next: (list) => {
        this.diretrizes = list;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onToggle(d: Diretriz): void {
    const novo = !(!!d.habilitado);
    this.svc.atualizar(d.code, novo).subscribe({
      next: (updated) => {
        d.habilitado = updated.habilitado;
        this.message.add({ severity: 'success', summary: 'Sucesso', detail: 'Diretriz atualizada.' });
      }
    });
  }
}
