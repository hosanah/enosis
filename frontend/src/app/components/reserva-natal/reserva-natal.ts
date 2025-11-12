import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageModule } from 'primeng/message';
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
    MessageModule
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
  isMesasCollapsed = false;
  mesas: { idmarcacaomesa?: number; nummesa: number; ordem: number; ocupados: number; quantidadetotal: number }[] = [];
  // Filtros e paginação de mesas
  mesaFilter: 'all' | 'occupied' | 'empty' | 'partial' = 'all';
  mesaPageSizeOptions = [50, 100, 200, 500];
  mesaPageSize = 50;
  mesaPage = 1;
  mesasFiltradas: { idmarcacaomesa?: number; nummesa: number; ordem: number; ocupados: number; quantidadetotal: number }[] = [];
  mesasPagina: { idmarcacaomesa?: number; nummesa: number; ordem: number; ocupados: number; quantidadetotal: number }[] = [];
  reservasDaMesa: { idreservasfront?: number; quantidade?: number; reservas?: number; numreserva?: string; coduh?: string; data_checkin?: string; data_checkout?: string; nome_hospede?: string }[] = [];
  reservaMesaSelecionada: { idreservasfront?: number; quantidade?: number; reservas?: number; numreserva?: string; coduh?: string; data_checkin?: string; data_checkout?: string; nome_hospede?: string } | null = null;
  isLoadingReservasMesa = false;

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
        this.aplicarFiltroMesas();
        if (!this.mesas.length) {
          this.messageService.add({ severity: 'info', summary: 'Mesas', detail: 'Nenhuma mesa encontrada.' });
        }
      },
      error: () => {
        this.mesas = [];
        this.mesasFiltradas = [];
        this.mesasPagina = [];
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
            numreserva: (r as any).numreserva ?? undefined,
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

  toggleMesas() {
    this.isMesasCollapsed = !this.isMesasCollapsed;
  }

  onSelecionarReserva(r: Reserva) {
    this.reservaSelecionada = r;
    this.isFiltrosCollapsed = true;
  }

  onSelecionarMesa(mesa: any) {
    if (mesa && typeof mesa === 'object') {
      this.mesaSelecionadaId = mesa.idmarcacaomesa ?? null;
      this.mesaSelecionada = `Mesa ${mesa.nummesa}`;
    } else {
      this.mesaSelecionada = String(mesa);
    }
    // Buscar reservas vinculadas somente se mesa tiver ocupação
    const ocupados = (mesa && typeof mesa === 'object') ? Number(mesa.ocupados || 0) : 0;
    this.reservaMesaSelecionada = null;
    if (this.mesaSelecionadaId && ocupados > 0) {
      this.isLoadingReservasMesa = true;
      this.reservasDaMesa = [];
      this.service.getReservasPorMesa(this.mesaSelecionadaId).subscribe({
        next: (res) => {
          this.reservasDaMesa = res.data || [];
          // Exibição via UI abaixo do formulário; sem alert/toast
        },
        error: () => {
          this.reservasDaMesa = [];
        },
        complete: () => {
          this.isLoadingReservasMesa = false;
        }
      });
    } else {
      this.reservasDaMesa = [];
    }
  }

  onSelecionarReservaDaMesa(item: { idreservasfront?: number; quantidade?: number; reservas?: number; numreserva?: string; coduh?: string; data_checkin?: string; data_checkout?: string; nome_hospede?: string }) {
    this.reservaMesaSelecionada = item || null;
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

  get reservaSelecionadaTexto(): string {
    const r = this.reservaSelecionada;
    return r ? `${r.nome_hospede} (UH ${r.coduh})` : '';
  }

  onLimparReserva() {
    this.reservaSelecionada = null;
  }

  onLimparMesa() {
    this.mesaSelecionada = null;
    this.mesaSelecionadaId = null;
  }

  onLimparFormulario() {
    this.confirmForm.reset({ quantidade: 1, observacoes: '' });
    this.mesaSelecionada = null;
    this.mesaSelecionadaId = null;
    this.reservaSelecionada = null;
  }

  onCancelar() {
    this.confirmForm.reset({ quantidade: 1, observacoes: '' });
    this.reservaSelecionada = null;
    this.mesaSelecionada = null;
    this.mesaSelecionadaId = null;
    this.reservasDaMesa = [];
    this.reservaMesaSelecionada = null;
  }

  onCancelarReservaMesa() {
    this.reservaMesaSelecionada = null;
  }

  // Filtro e paginação de mesas
  aplicarFiltroMesas() {
    const f = this.mesaFilter;
    this.mesasFiltradas = (this.mesas || []).filter(m => {
      const ocup = Number(m.ocupados || 0);
      const total = Number(m.quantidadetotal || 0);
      const isEmpty = total > 0 ? ocup === 0 : false;
      const isFull = total > 0 ? ocup === total : false;
      const isPartial = total > 0 ? ocup > 0 && ocup < total : false;
      switch (f) {
        case 'empty': return isEmpty;
        case 'occupied': return isFull;
        case 'partial': return isPartial;
        default: return true;
      }
    }).sort((a,b) => (a.ordem ?? a.nummesa) - (b.ordem ?? b.nummesa));
    this.mesaPage = 1;
    this.atualizarPaginaMesas();
  }

  atualizarPaginaMesas() {
    const start = (this.mesaPage - 1) * this.mesaPageSize;
    const end = start + this.mesaPageSize;
    this.mesasPagina = this.mesasFiltradas.slice(start, end);
  }

  totalPaginasMesas() {
    if (!this.mesasFiltradas.length || !this.mesaPageSize) return 1;
    return Math.max(1, Math.ceil(this.mesasFiltradas.length / this.mesaPageSize));
  }

  onMesaFilterChange(val: string) {
    const allowed = new Set(['all','occupied','empty','partial']);
    this.mesaFilter = allowed.has(val) ? (val as any) : 'all';
    this.aplicarFiltroMesas();
  }

  onMesaPageSizeChange(val: string | number) {
    const n = Number(val);
    this.mesaPageSize = this.mesaPageSizeOptions.includes(n) ? n : 50;
    this.mesaPage = 1;
    this.atualizarPaginaMesas();
  }

  prevMesaPage() {
    if (this.mesaPage > 1) {
      this.mesaPage--;
      this.atualizarPaginaMesas();
    }
  }

  nextMesaPage() {
    const last = this.totalPaginasMesas();
    if (this.mesaPage < last) {
      this.mesaPage++;
      this.atualizarPaginaMesas();
    }
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
