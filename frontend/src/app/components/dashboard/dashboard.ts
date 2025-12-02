/**
 * Componente de Dashboard
 * Tela principal protegida com dados do usuário
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG imports
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
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
    TableModule,
    TagModule,
    ProgressBarModule,
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
  statsCards: any[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    // Obter usuário atual
    this.currentUser = this.authService.getCurrentUser();

    // Carregar dados do dashboard
    this.loadDashboardData();

    // Escutar mudanças no estado de autenticação
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
        this.setupStatsCards();
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

  setupStatsCards(): void {
    if (!this.dashboardData?.stats) return;

    this.statsCards = [
      {
        title: 'Usuários Totais',
        value: this.dashboardData.stats.totalUsers,
        subtitle: 'Usuários cadastrados',
        icon: 'pi pi-users',
        iconBg: 'bg-blue-100 text-blue-600'
      },
      {
        title: 'Usuários Ativos',
        value: this.dashboardData.stats.activeUsers,
        subtitle: 'Online agora',
        icon: 'pi pi-user-plus',
        iconBg: 'bg-green-100 text-green-600',
      },
      {
        title: 'Sessões',
        value: this.dashboardData.stats.totalSessions,
        subtitle: 'Sessões ativas',
        icon: 'pi pi-desktop',
        iconBg: 'bg-yellow-100 text-yellow-600',
      },
      {
        title: 'Uptime',
        value: this.formatUptime(this.dashboardData.stats.serverUptime),
        subtitle: 'Tempo online',
        icon: 'pi pi-clock',
        iconBg: 'bg-purple-100 text-purple-600',
      }
    ];
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'info': return 'pi pi-info-circle';
      case 'success': return 'pi pi-check-circle';
      case 'warning': return 'pi pi-exclamation-triangle';
      case 'error': return 'pi pi-times-circle';
      default: return 'pi pi-info-circle';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
  }

  formatUptime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    return `${minutes}m`;
  }
}
