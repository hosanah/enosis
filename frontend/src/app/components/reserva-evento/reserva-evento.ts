import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { AutoCompleteModule } from 'primeng/autocomplete';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ChartModule } from 'primeng/chart';
import { CardModule } from 'primeng/card';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { extractErrorMessage } from '../../utils';
import { ReservaEventoService, Reserva, Evento, Disponibilidade } from '../../services/reserva-evento.service';

@Component({
  selector: 'app-reserva-evento',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SelectModule,
    AutoCompleteModule,
    TextareaModule,
    InputNumberModule,
    ButtonModule,
    ToastModule,
    ChartModule,
    CardModule,
    DatePickerModule,
    MessageModule,
    TagModule,
  ],
  providers: [MessageService],
  templateUrl: './reserva-evento.html',
  styleUrls: ['./reserva-evento.scss'],
})
export class ReservaEventoComponent {
  reservas: Reserva[] = [];
  reservaSelecionada?: Reserva;

  dataEvento?: Date | null;
  eventos: Evento[] = [];
  eventoSelecionado?: Evento;
  hoje = new Date();

  disponibilidade?: Disponibilidade;
  chartData?: any;
  marcacoesExistentes: any[] = [];

  informacoes = '';
  quantidade?: number;

  constructor(private service: ReservaEventoService, private message: MessageService) {}

  buscarReserva(event: any): void {
    const codigo = event.query;
    if (!codigo) {
      this.reservas = [];
      return;
    }
    const hoje = new Date().toISOString().split('T')[0];
    this.service.buscarReservaValida(codigo, hoje).subscribe({
      next: r => {
        this.reservas = r ? [r] : [];
        if (r) {
          this.carregarMarcacoesExistentes();
        }
      },
      error: () => (this.reservas = []),
    });
  }

  onReservaSelect(): void {
    this.carregarMarcacoesExistentes();
  }

  selecionarData(): void {
    if (!this.dataEvento) {
      this.eventos = [];
      this.eventoSelecionado = undefined;
      return;
    }
    const data = this.dataEvento.toISOString().split('T')[0];
    this.service.getEventosPorData(data).subscribe({
      next: evs => {
        this.eventos = evs;
        this.eventoSelecionado = undefined;
        this.disponibilidade = undefined;
        this.chartData = undefined;
      },
    });
  }

  onEventoChange(): void {
    if (!this.eventoSelecionado?.id) {
      this.disponibilidade = undefined;
      this.chartData = undefined;
      return;
    }
    this.service.getDisponibilidade(this.eventoSelecionado.id).subscribe({
      next: info => {
        this.disponibilidade = info;
        this.chartData = {
          labels: ['Reservas', 'Vagas'],
          datasets: [
            {
              data: [info.ocupacao, info.vagas_restantes],
              backgroundColor: ['#EF4444', '#10B981'],
            },
          ],
        };
      },
      error: () => {
        this.disponibilidade = undefined;
        this.chartData = undefined;
      },
    });
  }

  salvarMarcacao(): void {
    if (!this.reservaSelecionada || !this.eventoSelecionado || !this.quantidade || !this.dataEvento) {
      this.message.add({ severity: 'error', summary: 'Erro', detail: 'Preencha todos os campos' });
      return;
    }
    
    // Validar regras de negócio
    const validacao = this.validarRegrasNegocio();
    if (!validacao.valido) {
      this.message.add({ severity: 'error', summary: 'Erro', detail: validacao.mensagem });
      return;
    }
    
    if (this.disponibilidade && this.quantidade > this.disponibilidade.vagas_restantes) {
      this.message.add({ severity: 'error', summary: 'Erro', detail: 'Quantidade excede vagas disponíveis' });
      return;
    }
    
    const payload = {
      reservaId: this.reservaSelecionada.id!,
      informacoes: this.informacoes,
      quantidade: this.quantidade,
    };
    
    this.service.marcar(this.eventoSelecionado.id!, payload).subscribe({
      next: res => {
        const voucherMsg = res?.voucher ? ` Voucher: ${res.voucher}` : '';
        this.message.add({ severity: 'success', summary: 'Sucesso', detail: 'Marcação salva' + voucherMsg });
        this.informacoes = '';
        this.quantidade = undefined;
        this.onEventoChange();
        this.carregarMarcacoesExistentes();
      },
      error: err => {
        const detail = extractErrorMessage(err);
        this.message.add({ severity: 'error', summary: 'Erro', detail });
      },
    });
  }

  atualizarStatus(marcacao: any, status: string): void {
    if (!marcacao?.evento_id || !marcacao?.reserva_id) {
      return;
    }

    this.service
      .atualizarStatus(marcacao.evento_id, marcacao.reserva_id, status)
      .subscribe({
        next: () => {
          this.message.add({ severity: 'success', summary: 'Sucesso', detail: 'Status atualizado' });
          this.carregarMarcacoesExistentes();
        },
        error: err => {
          const detail = extractErrorMessage(err);
          this.message.add({ severity: 'error', summary: 'Erro', detail });
        },
      });
  }

  getTagSeverity(status: string): string {
    switch (status) {
      case 'Finalizada':
        return 'success';
      case 'Cancelada':
        return 'danger';
      case 'Não compareceu':
      case 'Nao compareceu':
        return 'warning';
      default:
        return 'info';
    }
  }

  private validarRegrasNegocio(): { valido: boolean; mensagem: string } {
    if (!this.reservaSelecionada || !this.dataEvento) {
      return { valido: false, mensagem: 'Dados insuficientes para validação' };
    }

    // Calcular dias da reserva
    const checkin = new Date(this.reservaSelecionada.data_checkin!);
    const checkout = new Date(this.reservaSelecionada.data_checkout!);
    const diasReserva = Math.ceil((checkout.getTime() - checkin.getTime()) / (1000 * 60 * 60 * 24));

    // Determinar limite de marcações baseado no período
    let limiteMarcacoes = 1;
    if (diasReserva >= 7) {
      limiteMarcacoes = 3;
    } else if (diasReserva >= 3) {
      limiteMarcacoes = 2;
    }

    // Contar marcações existentes para esta reserva
    const totalMarcacoes = this.marcacoesExistentes.length;
    if (totalMarcacoes >= limiteMarcacoes) {
      return { 
        valido: false, 
        mensagem: `Limite de ${limiteMarcacoes} marcação(ões) atingido para esta reserva (${diasReserva} dias)` 
      };
    }

    // Verificar se já existe marcação para o mesmo dia
    const dataEventoStr = this.dataEvento.toISOString().split('T')[0];
    const marcacaoMesmoDia = this.marcacoesExistentes.find(m => 
      new Date(m.data_evento).toISOString().split('T')[0] === dataEventoStr
    );
    
    if (marcacaoMesmoDia) {
      return { 
        valido: false, 
        mensagem: 'Esta reserva já possui uma marcação para este dia' 
      };
    }

    return { valido: true, mensagem: '' };
  }

  private carregarMarcacoesExistentes(): void {
    if (!this.reservaSelecionada?.id) {
      this.marcacoesExistentes = [];
      return;
    }
    
    this.service.getMarcacoesDaReserva(this.reservaSelecionada.id).subscribe({
      next: marcacoes => {
        this.marcacoesExistentes = marcacoes;
      },
      error: () => {
        this.marcacoesExistentes = [];
      }
    });
  }

  abrirVoucher(marcacao: any): void {
    const eventoId = marcacao.evento_id || marcacao.eventoId;
    if (this.reservaSelecionada?.id && eventoId) {
      this.service.downloadVoucher(this.reservaSelecionada.id, eventoId).subscribe({
        next: blob => {
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
        },
        error: err => {
          const detail = extractErrorMessage(err);
          this.message.add({ severity: 'error', summary: 'Erro', detail });
        }
      });
    }
  }
}

