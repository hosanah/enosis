import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ReservaNatalService } from '../../services/reserva-natal.service';

type Reserva = {
  id: number;
  nome_hospede: string;
  coduh: string;
  data_checkin: Date | null;
  data_checkout: Date | null;
  qtd_hospedes?: number;
  numreserva?: string;
};

@Component({
  selector: 'app-reserva-natal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    TableModule,
    TooltipModule,
    ToastModule,
    DatePipe
  ],
  templateUrl: './reserva-natal.html',
  styleUrls: ['./reserva-natal.scss']
})
export class ReservaNatalComponent implements OnInit {
  filtroForm: FormGroup;
  confirmForm: FormGroup;

  reservas: Reserva[] = [];
  reservasFiltradas: Reserva[] = [];

  reservaSelecionada: Reserva | null = null;
  mesasDisponiveis: string[] = [];
  mesaSelecionada: string | null = null;
  mesaSelecionadaId: number | null = null;
  isFiltrosCollapsed = false;
  mesas: { idmarcacaomesa?: number; nummesa: number; ordem: number; ocupados: number; quantidadetotal: number }[] = [];

  constructor(private fb: FormBuilder, private service: ReservaNatalService, private messageService: MessageService) {
    this.filtroForm = this.fb.group({
      dataCheckin: [null],
      dataCheckout: [null],
      nome: [''],
      coduh: ['']
    });

    this.confirmForm = this.fb.group({
      quantidade: [1, [Validators.required, Validators.min(1)]],
      observacoes: ['']
    });

    this.reservas = [];
    this.reservasFiltradas = [];
    this.mesasDisponiveis = [];
  }

  ngOnInit(): void {
    this.carregarMesas();
  }

  carregarMesas(): void {
    this.service.getMesas().subscribe({
      next: (res) => {
        this.mesas = res.data || [];
        if (!this.mesas.length) {
          this.messageService.add({ severity: 'info', summary: 'Mesas', detail: 'Nenhuma mesa encontrada.' });
        }
      },
      error: () => {
        this.mesas = [];
        this.messageService.add({ severity: 'error', summary: 'Mesas', detail: 'Falha ao carregar as mesas.' });
      }
    });
  }

  onBuscar() {
    const { dataCheckin, dataCheckout, nome, coduh } = this.filtroForm.value;
    if (!dataCheckin && !dataCheckout && !nome && !coduh) {
      this.messageService.add({ severity: 'warn', summary: 'Filtro obrigatório', detail: 'Informe ao menos um filtro: Check-in, Check-out, Nome ou UH.' });
      return;
    }
    this.service.buscarReservas({ dataCheckin, dataCheckout, nome, coduh, page: 1, size: 10 })
      .subscribe({
        next: (res: any) => {
          this.reservas = (res.data || []).map((r: any) => ({
            id: r.id,
            nome_hospede: r.nome_hospede,
            coduh: r.coduh,
            data_checkin: r.data_checkin ? new Date(r.data_checkin) : null,
            data_checkout: r.data_checkout ? new Date(r.data_checkout) : null,
            qtd_hospedes: (r as any).qtd_hospedes ?? undefined
          }));
          this.reservasFiltradas = [...this.reservas];
          this.reservaSelecionada = null;
          this.mesaSelecionada = null;
          if (!this.reservas.length) {
            this.messageService.add({ severity: 'info', summary: 'Sem resultados', detail: 'Nenhuma reserva encontrada para os filtros informados.' });
          } else {
            this.messageService.add({ severity: 'success', summary: 'Busca concluída', detail: `${this.reservas.length} reserva(s) encontrada(s).` });
          }
        },
        error: () => {
          this.reservas = [];
          this.reservasFiltradas = [];
          this.messageService.add({ severity: 'error', summary: 'Erro', detail: 'Falha ao consultar reservas no servidor.' });
        }
      });
  }

  toggleFiltros() {
    this.isFiltrosCollapsed = !this.isFiltrosCollapsed;
  }

  onSelecionarReserva(r: Reserva) {
    this.reservaSelecionada = r;
    this.mesaSelecionada = null;
    this.isFiltrosCollapsed = true;
  }

    onSelecionarMesa(mesa: any) {
    if (mesa && typeof mesa === 'object') {
      this.mesaSelecionadaId = mesa.idmarcacaomesa ?? null;
      this.mesaSelecionada = `Mesa ${mesa.nummesa}`;
    } else {
      this.mesaSelecionada = String(mesa);
    }
  }

  trackByMesa(index: number, mesa: string) {
    return mesa;
  }
  
  mesaClass(m: { nummesa: number; ocupados: number; quantidadetotal: number }) {
    const isSelected = this.mesaSelecionada === `Mesa ${m.nummesa}`;
    const classes: any = { selected: isSelected };
    if (m.ocupados === 0) {
      classes['p-button-info'] = true;
    } else if (m.ocupados > 0 && m.ocupados < m.quantidadetotal) {
      classes['p-button-warning'] = true;
    } else {
      classes['p-button-danger'] = true;
    }
    return classes;
  }

  trackByMesaItem(index: number, m: { nummesa: number }) {
    return m.nummesa;
  }
  onSalvar() {
    if (!this.reservaSelecionada || !this.mesaSelecionada || this.confirmForm.invalid) return;
    if (!this.mesaSelecionadaId) {
      this.messageService.add({ severity: 'warn', summary: 'Mesa', detail: 'Selecione uma mesa.' });
      return;
    }
    const payload = {
      idreservasfront: this.reservaSelecionada.id,
      quantidade: Number(this.confirmForm.value.quantidade || 0),
      idmarcacaomesa: this.mesaSelecionadaId,
      observacao: String(this.confirmForm.value.observacoes || '') || undefined
    };
    this.service.salvarMarcacao(payload).subscribe({
      next: (res) => {
        this.messageService.add({ severity: 'success', summary: 'Salvo', detail: `Marcação salva (${res.atualizados}/${res.solicitados}).` });
        // Atualiza mesas e limpa todos os formulários e seleções
        this.carregarMesas();
        this.filtroForm.reset({ dataCheckin: null, dataCheckout: null, nome: '', coduh: '' });
        this.confirmForm.reset({ quantidade: 1, observacoes: '' });
        this.reservas = [];
        this.reservasFiltradas = [];
        this.reservaSelecionada = null;
        this.mesaSelecionada = null;
        this.mesaSelecionadaId = null;
      },
      error: (err) => {
        const msg = err?.error?.error || 'Falha ao salvar marcação.';
        this.messageService.add({ severity: 'error', summary: 'Erro', detail: msg });
      }
    });
  }
  
  onLimpar() {
    this.filtroForm.reset({ dataCheckin: null, dataCheckout: null, nome: "", coduh: "" });
    this.reservas = [];
    this.reservasFiltradas = [];
    this.reservaSelecionada = null;
    this.mesaSelecionada = null;
    this.mesasDisponiveis = [];
    this.messageService.add({ severity: "info", summary: "Limpo", detail: "Filtros e resultados foram limpos." });
  }
}
