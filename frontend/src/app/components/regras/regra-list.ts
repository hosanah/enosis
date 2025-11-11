import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RegraService, Regra } from '../../services/regras';
import { TableModule } from 'primeng/table';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-regra-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, ToggleSwitchModule, CardModule, ToastModule],
  providers: [MessageService],
  templateUrl: './regra-list.html',
  styleUrls: ['./regra-list.scss']
})
export class RegraListComponent implements OnInit {
  regras: Regra[] = [];
  isLoading = false;

  constructor(private service: RegraService, private messageService: MessageService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.service.getRegras().subscribe({
      next: data => {
        this.regras = data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  toggle(regra: Regra): void {
    this.service.updateRegra(regra.id, !regra.ativo).subscribe({
      next: () => {
        regra.ativo = !regra.ativo;
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Regra atualizada' });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao atualizar regra' });
      }
    });
  }
}
