/**
 * Lista de Eventos
 * Exibe eventos com ações básicas
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

// PrimeNG
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ToolbarModule } from 'primeng/toolbar';
import { IconFieldModule } from 'primeng/iconfield'
import { InputIconModule } from 'primeng/inputicon'
import { TieredMenuModule } from 'primeng/tieredmenu'

import { EventoService, Evento } from '../../services/eventos';
import { extractErrorMessage } from '../../utils';

@Component({
  selector: 'app-evento-list',
  standalone: true,
  imports: [CommonModule, RouterModule, CardModule, TableModule, PaginatorModule, ButtonModule, ToastModule, ToolbarModule, IconFieldModule, InputIconModule, TieredMenuModule],
  providers: [MessageService],
  templateUrl: './evento-list.html',
  styleUrls: ['./evento-list.scss']
})
export class EventoListComponent implements OnInit {
  eventos: Evento[] = [];
  isLoading = false;
  totalRecords = 0;
  page = 0;
  pageSize = 10;

  constructor(
    private service: EventoService,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.service.getEventos(this.page + 1, this.pageSize).subscribe({
      next: res => {
        this.eventos = res.data;
        this.totalRecords = res.total;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  onPage(event: any): void {
    this.page = event.first / event.rows;
    this.pageSize = event.rows;
    this.load();
  }

  novo(): void {
    this.router.navigate(['/eventos/novo']);
  }

  novoEmMassa(): void {
    this.router.navigate(['/eventos/em-massa']);
  }

  editar(id?: number): void {
    if (id) {
      this.router.navigate(['/eventos', id]);
    }
  }

  excluir(id?: number): void {
    if (!id) return;
    this.service.deleteEvento(id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Evento removido' });
        this.load();
      }
    });
  }

  salvar(evento: Evento): void {
    const { id, ...data } = evento;
    this.service.createEvento(data).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Evento salvo' });
        this.load();
      },
      error: err => this.showError('Erro ao salvar evento', err)
    });
  }

  private showError(summary: string, err: any): void {
    let detail = 'Falha na operação';
    if (err.status >= 400 && err.status < 500) {
      detail = extractErrorMessage(err);
    }
    this.messageService.add({ severity: 'error', summary, detail });
  }
}
