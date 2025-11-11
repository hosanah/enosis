/**
 * Lista de Restaurantes
 * Exibe restaurantes com ações básicas
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
import { ToolbarModule } from 'primeng/toolbar'

import { RestauranteService, Restaurante } from '../../services/restaurantes';
import { extractErrorMessage } from '../../utils';

@Component({
  selector: 'app-restaurante-list',
  standalone: true,
  imports: [CommonModule, RouterModule, CardModule, TableModule, PaginatorModule, ButtonModule, ToastModule, ToolbarModule],
  providers: [MessageService],
  templateUrl: './restaurante-list.html',
  styleUrls: ['./restaurante-list.scss']
})
export class RestauranteListComponent implements OnInit {
  restaurantes: Restaurante[] = [];
  isLoading = false;
  totalRecords = 0;
  page = 0;
  pageSize = 10;

  constructor(
    private service: RestauranteService,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.service.getRestaurantes(this.page + 1, this.pageSize).subscribe({
      next: res => {
        this.restaurantes = res.data;
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
    this.router.navigate(['/restaurantes/novo']);
  }

  editar(id?: number): void {
    if (id) {
      this.router.navigate(['/restaurantes', id]);
    }
  }

  excluir(id?: number): void {
    if (!id) return;
    this.service.deleteRestaurante(id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Restaurante removido' });
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
