from pathlib import Path
import re

path = Path('frontend/src/app/components/reserva-ano-novo/reserva-ano-novo.ts')
text = path.read_text(encoding='utf-8')
pattern = re.compile(r"  onImprimirVoucherMesa\(item: ReservaMesa\): void \{.*?\n  }\n}", re.S)
m = pattern.search(text)
if not m:
    raise SystemExit('pattern not found')

replacement = """  onImprimirVoucherMesa(item: ReservaMesa): void {
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
}"""

text = text[:m.start()] + replacement + text[m.end():]
path.write_text(text, encoding='utf-8')
