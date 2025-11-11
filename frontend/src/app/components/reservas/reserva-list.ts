/**
 * Lista de Reservas
 * Exibe reservas com ações básicas
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

// PrimeNG
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { ToolbarModule } from 'primeng/toolbar';

import { ReservaService, Reserva } from '../../services/reservas';
import { extractErrorMessage } from '../../utils';

@Component({
  selector: 'app-reserva-list',
  standalone: true,
  imports: [CommonModule, TableModule, PaginatorModule, ButtonModule, ToastModule, TagModule, CardModule, ToolbarModule],
  providers: [MessageService],
  templateUrl: './reserva-list.html',
  styleUrls: ['./reserva-list.scss']
})
export class ReservaListComponent implements OnInit {
  reservas: Reserva[] = [];
  isLoading = false;
  totalRecords = 0;
  page = 0;
  pageSize = 10;

  constructor(
    private service: ReservaService,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.service.getReservas(this.page + 1, this.pageSize).subscribe({
      next: res => {
        this.reservas = res.data;
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
    this.router.navigate(['/reservas/novo']);
  }

  editar(id?: number): void {
    if (id) {
      this.router.navigate(['/reservas', id]);
    }
  }

  excluir(id?: number): void {
    if (!id) return;
    this.service.deleteReserva(id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Reserva removida' });
        this.load();
      }
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
