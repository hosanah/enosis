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
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { Diretriz, DiretrizesService } from '../../services/diretrizes';

@Component({
  selector: 'app-diretrizes',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, CardModule, ToggleSwitch, ToastModule],
  providers: [MessageService],
  templateUrl: './diretrizes.html',
  styleUrls: ['./diretrizes.scss']
})
export class DiretrizesComponent implements OnInit {
  diretrizes: Diretriz[] = [];
  loading = false;

  constructor(private svc: DiretrizesService, private message: MessageService) {}

  ngOnInit(): void {
    this.carregar();
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
