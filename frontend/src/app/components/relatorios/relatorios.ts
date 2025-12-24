import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-relatorios',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './relatorios.html',
  styleUrls: ['./relatorios.scss']
})
export class RelatoriosComponent {
  private readonly apiUrl = environment.apiUrl;
  private readonly idhotel = 1;

  constructor(private http: HttpClient) {}

  private abrirPdf(url: string): void {
    this.http
      .get(url, { responseType: 'blob' })
      .subscribe({
        next: (blob) => {
          const fileURL = URL.createObjectURL(blob);
          window.open(fileURL, '_blank');
        }
      });
  }

  abrirRelatorioNatal(): void {
    const url = `${this.apiUrl}/natal/relatorios/mesas-por-uh?idhotel=${this.idhotel}`;
    this.abrirPdf(url);
  }

  abrirRelatorioNatalUhsPorMesa(): void {
    const url = `${this.apiUrl}/natal/relatorios/uh-por-mesa?idhotel=${this.idhotel}`;
    this.abrirPdf(url);
  }

  abrirRelatorioAnoNovo(): void {
    const url = `${this.apiUrl}/anonovo/relatorios/mesas-por-uh?idhotel=${this.idhotel}`;
    this.abrirPdf(url);
  }

  abrirRelatorioAnoNovoUhsPorMesa(): void {
    const url = `${this.apiUrl}/anonovo/relatorios/uh-por-mesa?idhotel=${this.idhotel}`;
    this.abrirPdf(url);
  }

  abrirRelatorioNatalUhsSemMarcacao(): void {
    const url = `${this.apiUrl}/natal/relatorios/uhs-sem-marcacao?idhotel=${this.idhotel}`;
    this.abrirPdf(url);
  }

  abrirRelatorioAnoNovoUhsSemMarcacao(): void {
    const url = `${this.apiUrl}/anonovo/relatorios/uhs-sem-marcacao?idhotel=${this.idhotel}`;
    this.abrirPdf(url);
  }
}
