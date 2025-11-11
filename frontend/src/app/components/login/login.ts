/**
 * Componente de Login
 * Tela de autenticação com formulário responsivo
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';

// PrimeNG imports
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { AuthService, LoginRequest } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    CardModule,
    MessageModule,
    ToastModule,
    RouterModule
  ],
  providers: [MessageService],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class LoginComponent implements OnInit {
  credentials: LoginRequest = {
    username: '',
    password: ''
  };

  isLoading = false;
  returnUrl = '/dashboard';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    // Obter URL de retorno dos query params
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';

    // Se já estiver autenticado, redirecionar
    if (this.authService.isAuthenticated()) {
      this.router.navigate([this.returnUrl]);
    }
  }

  onSubmit(): void {
    if (!this.credentials.username || !this.credentials.password) {
      this.showError('Por favor, preencha todos os campos');
      return;
    }

    this.isLoading = true;

    this.authService.login(this.credentials).subscribe({
      next: (response) => {
        this.isLoading = false;
        
        this.messageService.add({
          severity: 'success',
          summary: 'Login realizado!',
          detail: `Bem-vindo, ${response.user.fullName || response.user.username}!`
        });

        // Redirecionar após pequeno delay para mostrar a mensagem
        setTimeout(() => {
          this.router.navigate([this.returnUrl]);
        }, 1000);
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  private showError(message: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Erro',
      detail: message
    });
  }
}
