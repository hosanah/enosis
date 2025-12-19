/**
 * Componente de Dashboard
 * Visao consolidada para Natal e Ano Novo
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, interval, takeUntil } from 'rxjs';

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
  lastUpdated: Date | null = null;
  isLoading = true;
  readonly refreshIntervalMs = 30000;

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadDashboardData();
    this.startAutoRefresh();

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

  loadDashboardData(options: { showLoading?: boolean; showToast?: boolean } = {}): void {
    const { showLoading = true, showToast = true } = options;

    if (showLoading) {
      this.isLoading = true;
    }

    this.apiService.getDashboardData().subscribe({
      next: (response) => {
        this.dashboardData = response.data;
        this.lastUpdated = new Date();
        this.isLoading = false;

        if (showToast) {
          this.messageService.add({
            severity: 'success',
            summary: 'Dashboard carregado',
            detail: 'Dados atualizados com sucesso'
          });
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Erro ao carregar dashboard:', error);
      }
    });
  }

  private startAutoRefresh(): void {
    interval(this.refreshIntervalMs)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadDashboardData({ showLoading: false, showToast: false });
      });
  }
}
