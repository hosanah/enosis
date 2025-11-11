import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule, CardModule, PasswordModule, ButtonModule, ToastModule],
  providers: [MessageService],
  templateUrl: './change-password.html',
  styleUrls: ['./change-password.scss']
})
export class ChangePasswordComponent {
  password = '';
  isLoading = false;

  constructor(private authService: AuthService, private router: Router, private messageService: MessageService) {}

  onSubmit(): void {
    const user = this.authService.getCurrentUser();
    if (!user?.email || !this.password) { return; }
    this.isLoading = true;
    this.authService.resetPassword(user.email, this.password).subscribe({
      next: () => {
        this.isLoading = false;
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Senha alterada com sucesso' });
        setTimeout(() => this.router.navigate(['/dashboard']), 1000);
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }
}

