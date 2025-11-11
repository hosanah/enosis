/**
 * Lista de Usuários
 * Exibe todos os usuários com ações de edição e ativação/desativação
 */

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

// PrimeNG
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { ToolbarModule } from 'primeng/toolbar'

import { UserService, AppUser } from '../../services/users';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, TableModule, PaginatorModule, ButtonModule, ToastModule, TagModule, CardModule, ToolbarModule],
  providers: [MessageService],
  templateUrl: './user-list.html',
  styleUrls: ['./user-list.scss']
})
export class UserListComponent implements OnInit {
  users: AppUser[] = [];
  isLoading = false;
  totalRecords = 0;
  page = 0;
  pageSize = 10;

  constructor(private userService: UserService, private router: Router, private messageService: MessageService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.userService.getUsers(this.page + 1, this.pageSize).subscribe({
      next: res => {
        this.users = res.data;
        this.totalRecords = res.total;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  onPage(event: any): void {
    this.page = event.first / event.rows;
    this.pageSize = event.rows;
    this.loadUsers();
  }

  createUser(): void {
    this.router.navigate(['/users/new']);
  }

  editUser(id?: number): void {
    if (id) this.router.navigate(['/users', id]);
  }

  toggleActive(user: AppUser): void {
    if (!user.id) return;
    const action = user.is_active ? 'desativar' : 'reativar';
    if (!confirm(`Deseja ${action} este usuário?`)) return;
    this.userService
      .updateUser(user.id, { is_active: !user.is_active })
      .subscribe({
        next: () => {
          const detail = user.is_active ? 'Usuário desativado' : 'Usuário reativado';
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail });
          this.loadUsers();
        }
      });
  }
}
