/**
 * Formulário de Reserva
 * Usado para criação e edição de reservas
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

// PrimeNG
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { ReservaService, Reserva } from '../../services/reservas';
import { extractErrorMessage } from '../../utils';

@Component({
  selector: 'app-reserva-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CardModule, InputTextModule, ButtonModule, ToastModule],
  providers: [MessageService],
  templateUrl: './reserva-form.html',
  styleUrls: ['./reserva-form.scss']
})
export class ReservaFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  isLoading = false;
  private id?: number;

  constructor(
    private fb: FormBuilder,
    private service: ReservaService,
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService
  ) {
    this.form = this.fb.group({
      idreservacm: [null, [Validators.required, Validators.pattern(/^\d+$/)]],
      numeroreservacm: ['', Validators.required],
      coduh: ['', Validators.required],
      nome_hospede: ['', Validators.required],
      contato: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      data_checkin: ['', [Validators.required, Validators.pattern(/^\d{4}-\d{2}-\d{2}$/)]],
      data_checkout: ['', [Validators.required, Validators.pattern(/^\d{4}-\d{2}-\d{2}$/)]],
      qtd_hospedes: [null, [Validators.required, Validators.pattern(/^\d+$/)]]
    });
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.id = Number(idParam);
      this.isEdit = true;
      this.service.getReserva(this.id).subscribe({
        next: data => this.form.patchValue(data)
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const value = this.form.value as Reserva;
    const request = this.isEdit && this.id
      ? this.service.updateReserva(this.id, value)
      : this.service.createReserva(value);

    request.subscribe({
      next: () => {
        this.isLoading = false;
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Reserva salva' });
        this.router.navigate(['/reservas']);
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/reservas']);
  }

  private showError(summary: string, err: any): void {
    let detail = 'Falha na operação';
    if (err.status >= 400 && err.status < 500) {
      detail = extractErrorMessage(err);
    }
    this.messageService.add({ severity: 'error', summary, detail });
  }
}
