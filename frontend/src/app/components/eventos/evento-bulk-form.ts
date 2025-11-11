/**
 * Formulário de Eventos em Massa
 * Permite criação de vários eventos em um intervalo de datas
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';

// PrimeNG
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';

import { EventoService, EventoMassa } from '../../services/eventos';
import { RestauranteService, Restaurante } from '../../services/restaurantes';
import { extractErrorMessage } from '../../utils';

@Component({
  selector: 'app-evento-bulk-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CardModule, InputTextModule, ButtonModule, ToastModule, SelectModule],
  providers: [MessageService],
  templateUrl: './evento-bulk-form.html',
  styleUrls: ['./evento-bulk-form.scss']
})
export class EventoBulkFormComponent implements OnInit {
  form: FormGroup;
  isLoading = false;
  restaurantes: Restaurante[] = [];

  constructor(
    private fb: FormBuilder,
    private service: EventoService,
    private restauranteService: RestauranteService,
    private router: Router,
    private messageService: MessageService
  ) {
    this.form = this.fb.group({
      nome: ['', Validators.required],
      dataInicio: ['', [Validators.required, Validators.pattern(/^\d{4}-\d{2}-\d{2}$/)]],
      dataFim: ['', [Validators.required, Validators.pattern(/^\d{4}-\d{2}-\d{2}$/)]],
      hora: ['', [Validators.required, Validators.pattern(/^\d{2}:\d{2}$/)]],
      restauranteId: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.restauranteService.getRestaurantes(1, 100).subscribe({
      next: res => (this.restaurantes = res.data),
      error: err => this.showError('Erro ao carregar restaurantes', err)
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { dataInicio, dataFim } = this.form.value as EventoMassa;
    if (dataInicio > dataFim) {
      this.messageService.add({ severity: 'error', summary: 'Erro', detail: 'Data final deve ser após a inicial' });
      return;
    }

    this.isLoading = true;
    this.service.createEventosEmMassa(this.form.value as EventoMassa).subscribe({
      next: () => {
        this.isLoading = false;
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Eventos criados' });
        this.router.navigate(['/eventos']);
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/eventos']);
  }

  private showError(summary: string, err: any): void {
    let detail = 'Falha na operação';
    if (err.status >= 400 && err.status < 500) {
      detail = extractErrorMessage(err);
    }
    this.messageService.add({ severity: 'error', summary, detail });
  }
}
