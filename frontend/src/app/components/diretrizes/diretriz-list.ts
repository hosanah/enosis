/**
 * Lista de Diretrizes
 * Exibe diretrizes com ações básicas
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

import { DiretrizService, Diretriz } from '../../services/diretrizes';
import { extractErrorMessage } from '../../utils';

@Component({
  selector: 'app-diretriz-list',
  standalone: true,
  imports: [CommonModule, RouterModule, CardModule, TableModule, PaginatorModule, ButtonModule, ToastModule, ToolbarModule],
  providers: [MessageService],
  templateUrl: './diretriz-list.html',
  styleUrls: ['./diretriz-list.scss']
})
export class DiretrizListComponent implements OnInit {
  diretrizes: Diretriz[] = [];
  isLoading = false;
  totalRecords = 0;
  page = 0;
  pageSize = 10;

  constructor(
    private service: DiretrizService,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.service.getDiretrizes(this.page + 1, this.pageSize).subscribe({
      next: res => {
        this.diretrizes = res.data;
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
    this.router.navigate(['/diretrizes/novo']);
  }

  editar(id?: number): void {
    if (id) {
      this.router.navigate(['/diretrizes', id]);
    }
  }

  excluir(id?: number): void {
    if (!id) return;
    this.service.deleteDiretriz(id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Diretriz removida' });
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
