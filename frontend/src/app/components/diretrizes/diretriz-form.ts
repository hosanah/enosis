/**
 * Formulário de Diretriz
 * Usado para criação e edição de diretrizes
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

// PrimeNG
import { CardModule } from 'primeng/card';
import { TextareaModule } from 'primeng/textarea'
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { DiretrizService, Diretriz } from '../../services/diretrizes';
import { extractErrorMessage } from '../../utils';

@Component({
  selector: 'app-diretriz-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CardModule, TextareaModule, ToggleSwitchModule, ButtonModule, ToastModule],
  providers: [MessageService],
  templateUrl: './diretriz-form.html',
  styleUrls: ['./diretriz-form.scss']
})
export class DiretrizFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  isLoading = false;
  private id?: number;

  constructor(
    private fb: FormBuilder,
    private service: DiretrizService,
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService
  ) {
    this.form = this.fb.group({
      descricao: ['', Validators.required],
      ativo: [true]
    });
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.id = Number(idParam);
      this.isEdit = true;
      this.service.getDiretriz(this.id).subscribe({
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
    const value = this.form.value as Diretriz;
    const request = this.isEdit && this.id
      ? this.service.updateDiretriz(this.id, value)
      : this.service.createDiretriz(value);

    request.subscribe({
      next: () => {
        this.isLoading = false;
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Diretriz salva' });
        this.router.navigate(['/diretrizes']);
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/diretrizes']);
  }

  private showError(summary: string, err: any): void {
    let detail = 'Falha na operação';
    if (err.status >= 400 && err.status < 500) {
      detail = extractErrorMessage(err);
    }
    this.messageService.add({ severity: 'error', summary, detail });
  }
}
