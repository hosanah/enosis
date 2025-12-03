/**
 * Componente de Dashboard
 * Visao consolidada para Natal e Ano Novo
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { SkeletonModule } from 'primeng/skeleton';

import { AuthService, User } from '../../services/auth';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ToastModule,
    SkeletonModule
  ],
  providers: [MessageService],
  templateUrl: './dashboard.html',
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  dashboardData: any = null;
  isLoading = true;

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadDashboardData();

    this.authService.authState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.currentUser = state.user;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDashboardData(): void {
    this.isLoading = true;

    this.apiService.getDashboardData().subscribe({
      next: (response) => {
        this.dashboardData = response.data;
        this.isLoading = false;

        this.messageService.add({
          severity: 'success',
          summary: 'Dashboard carregado',
          detail: 'Dados atualizados com sucesso'
        });
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Erro ao carregar dashboard:', error);
      }
    });
  }
}
