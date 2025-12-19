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
import { ReservaNatalService } from '../../services/reserva-natal.service';

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
  observacoes?: string;
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
    MessageModule,
    ConfirmDialogModule,
    CardModule
  ],
  templateUrl: './reserva-natal.html',
  styleUrls: ['./reserva-natal.scss'],
  providers: [ConfirmationService]
})
export class ReservaNatalComponent implements OnInit {
  filtroForm: FormGroup;
  confirmForm: FormGroup;

  reservas: Reserva[] = [];
  reservasFiltradas: Reserva[] = [];

  reservaSelecionada: Reserva | null = null;
  mesasDisponiveis: string[] = [];
  mesaSelecionada: string | null = null;
  mesaSelecionadaInfo: { idmarcacaomesa?: number; nummesa: number; ordem: number; ocupados: number; quantidadetotal: number } | null = null;
  mesaSelecionadaId: number | null = null;

  isFiltrosCollapsed = false;
  isMesasCollapsed = false;

  mesas: { idmarcacaomesa?: number; nummesa: number; ordem: number; ocupados: number; quantidadetotal: number }[] = [];

  mesaFilter: 'all' | 'occupied' | 'empty' | 'partial' = 'all';
  mesaPageSizeOptions = [50, 100, 200, 500];
  mesaPageSize = 50;
  mesaPage = 1;
  mesasFiltradas: { idmarcacaomesa?: number; nummesa: number; ordem: number; ocupados: number; quantidadetotal: number }[] = [];
  mesasPagina: { idmarcacaomesa?: number; nummesa: number; ordem: number; ocupados: number; quantidadetotal: number }[] = [];
  mesaVagasFilter: number | null = null;
  mesaVagasOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  reservasDaMesa: ReservaMesa[] = [];
  reservaMesaSelecionada: ReservaMesa | null = null;
  isLoadingReservasMesa = false;

  constructor(
    private fb: FormBuilder,
    private service: ReservaNatalService,
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
    this.service.buscarReservas({ dataCheckin, dataCheckout, nome, coduh, page: 1, size: 10 }).subscribe({
      next: (res: any) => {
        this.reservas = (res.data || []).map((r: any) => ({
          id: r.id,
          numreserva: (r as any).numreserva ?? undefined,
          nome_hospede: r.nome_hospede,
          coduh: r.coduh,
          data_checkin: r.data_checkin ? new Date(r.data_checkin) : null,
          data_checkout: r.data_checkout ? new Date(r.data_checkout) : null,
          qtd_hospedes: (r as any).qtd_hospedes ?? undefined,
          total_hospedes: (r as any).total_hospedes ?? (r as any).TOTALHOSPEDES ?? undefined
        }));
        this.reservasFiltradas = [...this.reservas];
        this.reservaSelecionada = null;
        this.mesaSelecionada = null;
        if (!this.reservas.length) {
          this.messageService.add({
            severity: 'info',
            summary: 'Sem resultados',
            detail: 'Nenhuma reserva encontrada para os filtros informados.'
          });
        } else {
          this.messageService.add({
            severity: 'success',
            summary: 'Busca concluÃ­da',
            detail: `${this.reservas.length} reserva(s) encontrada(s).`
          });
        }
      },
      error: () => {
        this.reservas = [];
        this.reservasFiltradas = [];
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Falha ao consultar reservas no servidor.'
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
    this.isFiltrosCollapsed = true;
  }

  onSelecionarMesa(mesa: any): void {
    this.mesaSelecionadaInfo = mesa && typeof mesa === 'object' ? mesa : null;
    this.mesaSelecionadaId = null;
    if (mesa && typeof mesa === 'object') {
      this.mesaSelecionadaId = mesa.idmarcacaomesa ?? null;
      this.mesaSelecionada = `Mesa ${mesa.nummesa}`;
    } else {
      this.mesaSelecionada = String(mesa);
    }

    const ocupados = this.mesaSelecionadaInfo ? Number(this.mesaSelecionadaInfo.ocupados || 0) : 0;
    this.reservaMesaSelecionada = null;

    if (this.mesaSelecionadaId && ocupados > 0) {
      this.isLoadingReservasMesa = true;
      this.reservasDaMesa = [];
      this.service.getReservasPorMesa(this.mesaSelecionadaId).subscribe({
        next: (res) => {
          this.reservasDaMesa = (res.data || []) as ReservaMesa[];
          this.reservaMesaSelecionada = this.reservasDaMesa[0] || null;
        },
        error: () => {
          this.reservasDaMesa = [];
          this.reservaMesaSelecionada = null;
        },
        complete: () => {
          this.isLoadingReservasMesa = false;
        }
      });
    } else {
      this.reservasDaMesa = [];
      this.reservaMesaSelecionada = null;
    }
  }

  onSelecionarReservaDaMesa(item: ReservaMesa): void {
    this.reservaMesaSelecionada = item || null;
  }

  onExcluirReservaMesa(x: { idreservasfront?: number }): void {
    if (!this.mesaSelecionadaId || !x?.idreservasfront) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cancelar reserva',
        detail: 'Selecione uma mesa e uma reserva válidas para cancelar.'
      });
      return;
    }

    this.reservaMesaSelecionada = x;

    this.confirmationService.confirm({
      header: 'Cancelar reserva da mesa',
      message: 'Esta ação não irreversvel. Deseja realmente cancelar a reserva desta mesa?',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sim, cancelar',
      rejectLabel: 'Não',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => this.executarCancelamentoReservaMesa()
    });
  }

  private executarCancelamentoReservaMesa(): void {
    if (!this.mesaSelecionadaId || !this.reservaMesaSelecionada?.idreservasfront) {
      return;
    }

    const payload = {
      idmarcacaomesa: this.mesaSelecionadaId,
      idreservasfront: this.reservaMesaSelecionada.idreservasfront
    };

    this.service.cancelarMarcacao(payload).subscribe({
      next: (res) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Reserva cancelada',
          detail: `Cancelamento realizado (${res.afetados} registro(s) atualizado(s)).`
        });
        this.reservaMesaSelecionada = null;
        this.carregarMesas();
        if (this.mesaSelecionadaInfo) {
          this.onSelecionarMesa(this.mesaSelecionadaInfo);
        }
      },
      error: (err) => {
        const msg = err?.error?.error || 'Falha ao cancelar reserva da mesa.';
        this.messageService.add({ severity: 'error', summary: 'Erro', detail: msg });
      }
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
      .voucher-divider {
        margin: 10px 0;
        border-top: 1px dashed #bbb;
      }
      .voucher-orientacao-title {
        font-weight: 600;
        margin: 6px 0 4px;
      }
      .voucher-orientacao {
        margin: 0 0 6px 16px;
        padding: 0;
      }
      .voucher-orientacao li {
        margin-bottom: 2px;
      }
      .voucher-footer-msg {
        margin-top: 6px;
        font-weight: 600;
        text-align: center;
      }
    `;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Voucher de Mesa</title>
          <style>${css}</style>
        </head>
        <body>
          <div class="voucher-card">
            <h3 class="voucher-title">Voucher de Mesa</h3>
            <div class="voucher-field"><strong>Mesa:</strong> ${mesaNumero}</div>
            <div class="voucher-field"><strong>Apartamento:</strong> ${coduh}</div>
            <div class="voucher-field"><strong>Hospede:</strong> ${hospede}</div>
            <div class="voucher-field"><strong>Pessoas:</strong> ${pessoas}</div>
            ${observacoes && observacoes.trim() !== '' 
            ? `<div class="voucher-field"><strong>Obs:</strong> ${observacoes}</div>`
            : `<div class="voucher-field"><strong>Obs:</strong> Nao ha observacoes</div>`}
            <div class="voucher-divider"></div>
            <div class="voucher-orientacao-title">Instruções de acesso</div>
            <ul class="voucher-orientacao">
              <li><b>Entrada pelo Splash: </b></li>
              <li>Reservas das Pracas 1, 2, 3 e 4</li>
              <li><b>Entrada pela Piscina de Ondas</b></li>
              <li>Reservas do Lounge</li>
              <li>Reservas das Pracas 5 e 6</li>
              <li>Reservas da Arena</li>
            </ul>
            <div class="voucher-footer-msg">A familia Enotel deseja um Feliz Natal!</div>
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

  trackByMesaItem(index: number, m: { nummesa?: number; idreservasfront?: number }): number | string {
    return m.nummesa ?? m.idreservasfront ?? index;
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
        severity: "warn",
        summary: "Mesa",
        detail: "Selecione uma mesa."
      });
      return;
    }

    const payload = {
      idreservasfront: r.id,
      quantidade: Number(this.confirmForm.value.quantidade || 0),
      idmarcacaomesa: this.mesaSelecionadaId,
      observacao: String(this.confirmForm.value.observacoes || "") || undefined
    };

    this.service.salvarMarcacao(payload).subscribe({
      next: (res) => {
        this.messageService.add({
          severity: "success",
          summary: "Salvo",
          detail: `Marcacao salva (${res.atualizados}/${res.solicitados}).`
        });

        const itemVoucher: ReservaMesa = {
          idreservasfront: r.id,
          quantidade: Number(this.confirmForm.value.quantidade || 0),
          numreserva: r.numreserva,
          coduh: r.coduh,
          nome_hospede: r.nome_hospede,
          observacoes: String(this.confirmForm.value.observacoes || "")
        };
        this.onImprimirVoucherMesa(itemVoucher);

        this.carregarMesas();
        this.filtroForm.reset({ dataCheckin: null, dataCheckout: null, nome: "", coduh: "" });
        this.confirmForm.reset({ quantidade: 1, observacoes: "" });
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
        const msg = err?.error?.error || "Falha ao salvar marcacao.";
        this.messageService.add({ severity: "error", summary: "Erro", detail: msg });
      }
    });
  }  onLimpar(): void {
    this.filtroForm.reset({ dataCheckin: null, dataCheckout: null, nome: '', coduh: '' });
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

  imprimirVoucher(): void {
    window.print();
  }
}






