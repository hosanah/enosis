import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageModule } from 'primeng/message';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { CardModule } from 'primeng/card';
import { ReservaAnoNovoService } from '../../services/reserva-ano-novo.service';

type Reserva = {
  id: number;
  nome_hospede: string;
  coduh: string;
  data_checkin: Date | null;
  data_checkout: Date | null;
  qtd_hospedes?: number;
  total_hospedes?: number;
  numreserva?: string;
};

type ReservaMesa = {
  idreservasfront?: number;
  quantidade?: number;
  reservas?: number;
  numreserva?: string;
  coduh?: string;
  data_checkin?: string;
  data_checkout?: string;
  nome_hospede?: string;
  observacoes?: string | null;
};

@Component({
  selector: 'app-reserva-ano-novo',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    TableModule,
    TooltipModule,
    ToastModule,
    MessageModule,
    ConfirmDialogModule,
    CardModule
  ],
  templateUrl: './reserva-ano-novo.html',
  styleUrls: ['./reserva-ano-novo.scss'],
  providers: [ConfirmationService]
})
export class ReservaAnoNovoComponent implements OnInit {
  filtroForm: FormGroup;
  confirmForm: FormGroup;

  reservas: Reserva[] = [];
  reservasFiltradas: Reserva[] = [];

  reservaSelecionada: Reserva | null = null;
  mesasDisponiveis: string[] = [];
  mesaSelecionada: string | null = null;
  mesaSelecionadaInfo: {
    idmarcacaomesa?: number;
    nummesa: number;
    ordem: number;
    ocupados: number;
    quantidadetotal: number;
  } | null = null;
  mesaSelecionadaId: number | null = null;

  isFiltrosCollapsed = false;
  isMesasCollapsed = false;

  mesas: {
    idmarcacaomesa?: number;
    nummesa: number;
    ordem: number;
    ocupados: number;
    quantidadetotal: number;
  }[] = [];

  mesaFilter: 'all' | 'occupied' | 'empty' | 'partial' = 'all';
  mesaPageSizeOptions = [50, 100, 200, 500];
  mesaPageSize = 50;
  mesaPage = 1;
  mesasFiltradas: {
    idmarcacaomesa?: number;
    nummesa: number;
    ordem: number;
    ocupados: number;
    quantidadetotal: number;
  }[] = [];
  mesasPagina: {
    idmarcacaomesa?: number;
    nummesa: number;
    ordem: number;
    ocupados: number;
    quantidadetotal: number;
  }[] = [];
  mesaVagasFilter: number | null = null;
  mesaVagasOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  reservasDaMesa: ReservaMesa[] = [];
  reservaMesaSelecionada: ReservaMesa | null = null;
  isLoadingReservasMesa = false;

  constructor(
    private fb: FormBuilder,
    private service: ReservaAnoNovoService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
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
          this.messageService.add({
            severity: 'info',
            summary: 'Mesas',
            detail: 'Nenhuma mesa encontrada.'
          });
        }
      },
      error: () => {
        this.mesas = [];
        this.mesasFiltradas = [];
        this.mesasPagina = [];
        this.messageService.add({
          severity: 'error',
          summary: 'Mesas',
          detail: 'Falha ao carregar as mesas.'
        });
      }
    });
  }

  onBuscar(): void {
    const { dataCheckin, dataCheckout, nome, coduh } = this.filtroForm.value;
    if (!dataCheckin && !dataCheckout && !nome && !coduh) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Filtro obrigatório',
        detail: 'Informe ao menos um filtro: Check-in, Check-out, Nome ou UH.'
      });
      return;
    }
    this.service
      .buscarReservas({ dataCheckin, dataCheckout, nome, coduh, page: 1, size: 10 })
      .subscribe({
        next: (res: any) => {
          this.reservas = (res.data || []).map((r: any) => ({
            id: r.id,
            numreserva: (r as any).numreserva ?? undefined,
            nome_hospede: r.nome_hospede,
            coduh: r.coduh,
            data_checkin: r.data_checkin ? new Date(r.data_checkin) : null,
            data_checkout: r.data_checkout ? new Date(r.data_checkout) : null,
            qtd_hospedes: (r as any).qtd_hospedes ?? undefined,
            total_hospedes:
              (r as any).total_hospedes ?? (r as any).TOTALHOSPEDES ?? undefined
          }));
          this.reservasFiltradas = [...this.reservas];
          if (!this.reservasFiltradas.length) {
            this.messageService.add({
              severity: 'info',
              summary: 'Reservas',
              detail: 'Nenhuma reserva encontrada para os filtros informados.'
            });
          }
        },
        error: () => {
          this.reservas = [];
          this.reservasFiltradas = [];
          this.messageService.add({
            severity: 'error',
            summary: 'Reservas',
            detail: 'Falha ao buscar reservas.'
          });
        }
      });
  }

  toggleFiltros(): void {
    this.isFiltrosCollapsed = !this.isFiltrosCollapsed;
  }

  toggleMesas(): void {
    this.isMesasCollapsed = !this.isMesasCollapsed;
  }

  onSelecionarReserva(r: Reserva): void {
    this.reservaSelecionada = r;
    this.confirmForm.patchValue({
      quantidade: r.total_hospedes ?? r.qtd_hospedes ?? 1
    });
  }

  onSelecionarMesa(m: {
    idmarcacaomesa?: number;
    nummesa: number;
    ordem: number;
    ocupados: number;
    quantidadetotal: number;
  }): void {
    this.mesaSelecionada = `Mesa ${m.nummesa}`;
    this.mesaSelecionadaId = m.idmarcacaomesa ?? null;
    this.mesaSelecionadaInfo = m;
    this.reservaMesaSelecionada = null;
    if (!this.mesaSelecionadaId) {
      this.reservasDaMesa = [];
      return;
    }
    this.isLoadingReservasMesa = true;
    this.service.getReservasPorMesa(this.mesaSelecionadaId).subscribe({
      next: (res) => {
        this.reservasDaMesa = res.data || [];
        this.isLoadingReservasMesa = false;
      },
      error: () => {
        this.reservasDaMesa = [];
        this.isLoadingReservasMesa = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Reservas da mesa',
          detail: 'Falha ao carregar reservas da mesa.'
        });
      }
    });
  }

  trackByMesaItem(_: number, item: any) {
    return (
      item.idmarcacaomesa ||
      item.idreservasfront ||
      item.nummesa ||
      item.coduh ||
      item
    );
  }

  mesaClass(m: { nummesa: number; ocupados: number; quantidadetotal: number }): any {
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

  onSelecionarReservaDaMesa(r: ReservaMesa): void {
    this.reservaMesaSelecionada = r;
  }

  onExcluirReservaMesa(r: ReservaMesa): void {
    if (!this.mesaSelecionadaId || !r.idreservasfront) {
      return;
    }

    this.confirmationService.confirm({
      header: 'Confirmar cancelamento',
      message:
        'Esta ação é irreversível. Deseja realmente cancelar a reserva desta mesa?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sim, cancelar',
      rejectLabel: 'Não',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        const payload = {
          idmarcacaomesa: this.mesaSelecionadaId as number,
          idreservasfront: r.idreservasfront as number
        };
        this.service.cancelarMarcacao(payload).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Cancelado',
              detail: 'Reserva da mesa cancelada com sucesso.'
            });
            if (this.mesaSelecionadaId) {
              this.onSelecionarMesa({
                idmarcacaomesa: this.mesaSelecionadaId,
                nummesa: this.mesaSelecionadaInfo?.nummesa || 0,
                ordem: this.mesaSelecionadaInfo?.ordem || 0,
                ocupados: this.mesaSelecionadaInfo?.ocupados || 0,
                quantidadetotal:
                  this.mesaSelecionadaInfo?.quantidadetotal || 0
              });
            }
            this.carregarMesas();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Erro',
              detail: 'Falha ao cancelar reserva da mesa.'
            });
          }
        });
      }
    });
  }

  get reservaSelecionadaTexto(): string {
    const r = this.reservaSelecionada;
    return r ? `${r.nome_hospede} (UH ${r.coduh})` : '';
  }

  onLimparReserva(): void {
    this.reservaSelecionada = null;
  }

  onLimparMesa(): void {
    this.mesaSelecionada = null;
    this.mesaSelecionadaId = null;
    this.mesaSelecionadaInfo = null;
    this.reservasDaMesa = [];
    this.reservaMesaSelecionada = null;
  }

  aplicarFiltroMesas(): void {
    const f = this.mesaFilter;
    const vagas = this.mesaVagasFilter;
    this.mesasFiltradas = (this.mesas || [])
      .filter((m) => {
        const ocup = Number(m.ocupados || 0);
        const total = Number(m.quantidadetotal || 0);
        const isEmpty = total > 0 ? ocup === 0 : false;
        const isFull = total > 0 ? ocup === total : false;
        const isPartial = total > 0 ? ocup > 0 && ocup < total : false;
        switch (f) {
          case 'empty':
            return isEmpty;
          case 'occupied':
            return isFull;
          case 'partial':
            return isPartial;
          default:
            return true;
        }
      })
      .filter((m) => {
        if (vagas == null) {
          return true;
        }
        const total = Number(m.quantidadetotal || 0);
        const ocup = Number(m.ocupados || 0);
        if (!Number.isFinite(total) || total <= 0) {
          return false;
        }
        const disponiveis = Math.max(0, total - (Number.isFinite(ocup) ? ocup : 0));
        return disponiveis === vagas;
      })
      .sort((a, b) => (a.ordem ?? a.nummesa) - (b.ordem ?? b.nummesa));
    this.mesaPage = 1;
    this.atualizarPaginaMesas();
  }

  atualizarPaginaMesas(): void {
    const start = (this.mesaPage - 1) * this.mesaPageSize;
    const end = start + this.mesaPageSize;
    this.mesasPagina = this.mesasFiltradas.slice(start, end);
  }

  totalPaginasMesas(): number {
    if (!this.mesasFiltradas.length || !this.mesaPageSize) return 1;
    return Math.max(1, Math.ceil(this.mesasFiltradas.length / this.mesaPageSize));
  }

  onMesaFilterChange(val: string): void {
    const allowed = new Set(['all', 'occupied', 'empty', 'partial']);
    this.mesaFilter = allowed.has(val) ? (val as any) : 'all';
    this.aplicarFiltroMesas();
  }

  onMesaVagasChange(val: string | number): void {
    const n = Number(val);
    this.mesaVagasFilter = Number.isFinite(n) && n >= 1 && n <= 10 ? n : null;
    this.aplicarFiltroMesas();
  }

  onMesaPageSizeChange(val: string | number): void {
    const n = Number(val);
    this.mesaPageSize = this.mesaPageSizeOptions.includes(n) ? n : 50;
    this.mesaPage = 1;
    this.atualizarPaginaMesas();
  }

  prevMesaPage(): void {
    if (this.mesaPage > 1) {
      this.mesaPage--;
      this.atualizarPaginaMesas();
    }
  }

  nextMesaPage(): void {
    const last = this.totalPaginasMesas();
    if (this.mesaPage < last) {
      this.mesaPage++;
      this.atualizarPaginaMesas();
    }
  }

  onSalvar(): void {
    const r = this.reservaSelecionada as Reserva;
    if (!r || !this.mesaSelecionada || this.confirmForm.invalid) {
      return;
    }
    if (!this.mesaSelecionadaId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Mesa',
        detail: 'Selecione uma mesa.'
      });
      return;
    }

    const payload = {
      idreservasfront: r.id,
      quantidade: Number(this.confirmForm.value.quantidade || 0),
      idmarcacaomesa: this.mesaSelecionadaId,
      observacao: String(this.confirmForm.value.observacoes || '') || undefined
    };

    this.service.salvarMarcacao(payload).subscribe({
      next: (res) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Salvo',
          detail: `Marcacao salva (${res.atualizados}/${res.solicitados}).`
        });

        const itemVoucher: ReservaMesa = {
          idreservasfront: r.id,
          quantidade: Number(this.confirmForm.value.quantidade || 0),
          numreserva: r.numreserva,
          coduh: r.coduh,
          nome_hospede: r.nome_hospede,
          observacoes: String(this.confirmForm.value.observacoes || '')
        };
        this.onImprimirVoucherMesa(itemVoucher);

        this.carregarMesas();
        this.filtroForm.reset({
          dataCheckin: null,
          dataCheckout: null,
          nome: '',
          coduh: ''
        });
        this.confirmForm.reset({ quantidade: 1, observacoes: '' });
        this.reservas = [];
        this.reservasFiltradas = [];
        this.reservaSelecionada = null;
        this.mesaSelecionada = null;
        this.mesaSelecionadaId = null;
        this.mesaSelecionadaInfo = null;
        this.reservasDaMesa = [];
        this.reservaMesaSelecionada = null;
      },
      error: (err) => {
        const msg = err?.error?.error || 'Falha ao salvar marcacao.';
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: msg
        });
      }
    });
  }

  onLimpar(): void {
    this.filtroForm.reset({
      dataCheckin: null,
      dataCheckout: null,
      nome: '',
      coduh: ''
    });
    this.reservas = [];
    this.reservasFiltradas = [];
    this.reservaSelecionada = null;
    this.mesaSelecionada = null;
    this.mesaSelecionadaId = null;
    this.mesaSelecionadaInfo = null;
    this.reservasDaMesa = [];
    this.reservaMesaSelecionada = null;
    this.mesasDisponiveis = [];
    this.messageService.add({
      severity: 'info',
      summary: 'Limpo',
      detail: 'Filtros e resultados foram limpos.'
    });
  }

  onImprimirVoucherMesa(item: ReservaMesa): void {
    if (!this.mesaSelecionadaInfo) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Voucher',
        detail: 'Selecione uma mesa valida para imprimir o voucher.'
      });
      return;
    }

    this.reservaMesaSelecionada = item || null;

    const mesaNumero = this.mesaSelecionadaInfo?.nummesa ?? '';
    const coduh = item?.coduh ?? '';
    const hospede = (item?.nome_hospede || `Reserva ${item?.numreserva || ''}`).trim();
    const pessoas = item?.quantidade ?? item?.reservas ?? 0;
    const observacoes = item?.observacoes ?? '';

    const css = `
      body {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        margin: 0;
        padding: 16px;
      }
      .voucher-card {
        padding: 10px;
        font-size: 0.85rem;
        border: 1px solid #ccc;
        border-radius: 8px;
      }
      .voucher-title {
        font-size: 1rem;
        margin: 0 0 8px;
        text-align: center;
      }
      .voucher-field {
        margin-bottom: 4px;
        line-height: 1.2;
      }
    `;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Voucher de Mesa - Ano Novo</title>
          <style>${css}</style>
        </head>
        <body>
          <div class="voucher-card">
            <h3 class="voucher-title">Voucher de Mesa - Ano Novo</h3>
            <div class="voucher-field"><strong>Mesa:</strong> ${mesaNumero}</div>
            <div class="voucher-field"><strong>Apartamento:</strong> ${coduh}</div>
            <div class="voucher-field"><strong>Hospede:</strong> ${hospede}</div>
            <div class="voucher-field"><strong>Pessoas:</strong> ${pessoas}</div>
            ${observacoes && observacoes.trim() !== '' 
              ? `<div class="voucher-field"><strong>Obs:</strong> ${observacoes}</div>`
              : `<div class="voucher-field"><strong>Obs:</strong> Nenhuma observacao para a mesa</div>`}
          </div>
        </body>
      </html>
    `;

    this.imprimirDuasVias(html);
  }

  private imprimirDuasVias(html: string): void {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
      this.messageService.add({
        severity: 'error',
        summary: 'Impressao',
        detail: 'Nao foi possivel abrir a janela de impressao.'
      });
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();

    const dispararImpressao = () => printWindow.print();
    dispararImpressao();
    setTimeout(dispararImpressao, 500);
    setTimeout(() => printWindow.close(), 1500);
  }
}
