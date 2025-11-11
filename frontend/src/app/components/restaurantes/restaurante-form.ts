/**
 * Formulário de Restaurante
 * Usado para criação e edição de restaurantes
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

import { RestauranteService, Restaurante } from '../../services/restaurantes';
import { extractErrorMessage } from '../../utils';

@Component({
  selector: 'app-restaurante-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CardModule, InputTextModule, ButtonModule, ToastModule],
  providers: [MessageService],
  templateUrl: './restaurante-form.html',
  styleUrls: ['./restaurante-form.scss']
})
export class RestauranteFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  isLoading = false;
  private id?: number;

  constructor(
    private fb: FormBuilder,
    private service: RestauranteService,
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService
  ) {
    this.form = this.fb.group({
      nome: ['', Validators.required],
      capacidade: [null, Validators.required],
      descricao: ['']
    });
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.id = Number(idParam);
      this.isEdit = true;
      this.service.getRestaurante(this.id).subscribe({
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
    const value = this.form.value as Restaurante;
    const request = this.isEdit && this.id
      ? this.service.updateRestaurante(this.id, value)
      : this.service.createRestaurante(value);

    request.subscribe({
      next: () => {
        this.isLoading = false;
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Restaurante salvo' });
        this.router.navigate(['/restaurantes']);
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/restaurantes']);
  }

  private showError(summary: string, err: any): void {
    let detail = 'Falha na operação';
    if (err.status >= 400 && err.status < 500) {
      detail = extractErrorMessage(err);
    }
    this.messageService.add({ severity: 'error', summary, detail });
  }
}
