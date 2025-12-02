import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

// PrimeNG
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { UserService, AppUser } from '../../services/users';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule, 
    CardModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './user-form.html',
  styleUrls: ['./user-form.scss']
})
export class UserFormComponent implements OnInit {
  form: FormGroup;
  isEdit = false;
  isLoading = false;
  private userId?: number;

  private readonly strongPassword = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService
  ) {
    
    this.form = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      fullName: [''],
      password: [''],
      is_active: [true],
      qtd_hospedes: [null, [Validators.pattern(/^\d+$/)]]
    });
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEdit = true;
      this.userId = Number(idParam);
      this.form.removeControl('password');
      this.loadUser(this.userId);
    }
  }

  loadUser(id: number): void {
    this.userService.getUser(id).subscribe({
      next: data => {
        const fullName = data.fullName || (data as any).full_name;
        this.form.patchValue({
          id: data.id,
          username: data.username,
          email: data.email,
          fullName,
          is_active: data.is_active
        });
      },
      error: () => {
        this.router.navigate(['/users']);
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const formValue = this.form.value as AppUser;

    const needsValidation = !this.isEdit || !!formValue.password;
    if (needsValidation && !this.strongPassword.test(formValue.password || '')) {
      this.isLoading = false;
      this.messageService.add({
        severity: 'warn',
        summary: 'Senha fraca',
        detail: 'Senha deve ter pelo menos 8 caracteres, incluir letra maiúscula e caractere especial'
      });
      return;
    }

    const request = this.isEdit && this.userId
      ? this.userService.updateUser(this.userId, formValue)
      : this.userService.createUser(formValue);

    request.subscribe({
      next: () => {
        this.isLoading = false;
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Usuário salvo' });
        this.router.navigate(['/users']);
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/users']);
  }

  // Facilita acesso no template
  get f() {
    return this.form.controls;
  }
}
