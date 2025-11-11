import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ToolbarModule } from 'primeng/toolbar';
import { MessageService } from 'primeng/api';

import { ReservaEventoService, Marcacao } from '../../services/reserva-evento.service';

@Component({
  selector: 'app-reserva-evento-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    TagModule,
    SelectModule,
    ToastModule,
    ButtonModule,
    CardModule,
    ToolbarModule
  ],
  providers: [MessageService],
  templateUrl: './reserva-evento-list.html',
  styleUrls: ['./reserva-evento-list.scss']
})
export class ReservaEventoListComponent implements OnInit {
  marcacoes: Marcacao[] = [];
  isLoading = false;

  statusOptions = [
    { label: 'Pendente', value: 'PENDENTE' },
    { label: 'Confirmado', value: 'CONFIRMADO' },
    { label: 'Cancelado', value: 'CANCELADO' }
  ];

  constructor(private service: ReservaEventoService, private message: MessageService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.service.getEventosReservas().subscribe({
      next: res => {
        this.marcacoes = res;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  alterarStatus(m: Marcacao): void {
    this.service.updateMarcacaoStatus(m.id, m.status).subscribe({
      next: () => {
        this.message.add({ severity: 'success', summary: 'Sucesso', detail: 'Status atualizado' });
      },
      error: () => {
        this.message.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao atualizar status' });
      }
    });
  }

  getStatusSeverity(status: string): string {
    switch ((status || '').toLowerCase()) {
      case 'confirmado':
        return 'success';
      case 'cancelado':
        return 'danger';
      default:
        return 'info';
    }
  }
}
