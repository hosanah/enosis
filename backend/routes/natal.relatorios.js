const express = require('express');
const router = express.Router();
const { getOracle } = require('../config/oracle');
const PDFDocument = require('pdfkit');
const path = require('path');

// GET /anonovo/relatorios/mesas-por-uh
// Relatório PDF: listagem de mesas por UH (Ano Novo)
router.get('/mesas-por-uh', async (req, res) => {
  try {
    const db = getOracle();
    const idhotel = Number(req.query.idhotel || 1);

    const sql = `
      -- 1) Mesas distintas
      WITH MESAS AS (
        SELECT DISTINCT
          RF.CODUH,
          RF.IDHOTEL,
          EM.NUMMESA,
          EI.DESCRICAO
        FROM CM.ENOMARCACAOMESAANO EM
        JOIN CM.ENOMARCACAOITEMANO EI 
          ON EI.IDMARCACAOMESA = EM.IDMARCACAOMESA
        JOIN CM.RESERVASFRONT RF 
          ON RF.IDRESERVASFRONT = EI.IDRESERVASFRONT
      ),

      -- 2) Contagem bruta
      CONTAGEM AS (
        SELECT 
          RF.CODUH,
          COUNT(*) AS QTD
        FROM CM.ENOMARCACAOMESAANO EM
        JOIN CM.ENOMARCACAOITEMANO EI 
          ON EI.IDMARCACAOMESA = EM.IDMARCACAOMESA
        JOIN CM.RESERVASFRONT RF 
          ON RF.IDRESERVASFRONT = EI.IDRESERVASFRONT
        GROUP BY RF.CODUH
      ),

      -- 3) Mesas numeradas
      MESAS_RN AS (
        SELECT
          CODUH,
          IDHOTEL,
          NUMMESA,
          DESCRICAO,
          ROW_NUMBER() OVER (
            PARTITION BY CODUH ORDER BY NUMMESA
          ) AS RN
        FROM MESAS
      )

      SELECT
        UH.CODUH,
        UH.IDHOTEL,

        MAX(CASE WHEN M.RN = 1 THEN M.NUMMESA END) AS MESA1,
        MAX(CASE WHEN M.RN = 2 THEN M.NUMMESA END) AS MESA2,
        MAX(CASE WHEN M.RN = 3 THEN M.NUMMESA END) AS MESA3,
        MAX(CASE WHEN M.RN = 4 THEN M.NUMMESA END) AS MESA4,
        MAX(CASE WHEN M.RN = 5 THEN M.NUMMESA END) AS MESA5,
        MAX(CASE WHEN M.RN = 6 THEN M.NUMMESA END) AS MESA6,

        C.QTD AS QUANTIDADE,

        MAX(CASE WHEN M.RN = 1 THEN M.DESCRICAO END) AS OBS1,
        MAX(CASE WHEN M.RN = 2 THEN M.DESCRICAO END) AS OBS2,
        MAX(CASE WHEN M.RN = 3 THEN M.DESCRICAO END) AS OBS3,
        MAX(CASE WHEN M.RN = 4 THEN M.DESCRICAO END) AS OBS4,
        MAX(CASE WHEN M.RN = 5 THEN M.DESCRICAO END) AS OBS5,
        MAX(CASE WHEN M.RN = 6 THEN M.DESCRICAO END) AS OBS6

      FROM CM.UH UH
      LEFT JOIN MESAS_RN M ON M.CODUH = UH.CODUH
      LEFT JOIN CONTAGEM  C ON C.CODUH = UH.CODUH

      WHERE UH.UHPOOL = 'S'
        AND UH.IDHOTEL = ?

      GROUP BY 
        UH.CODUH,
        UH.IDHOTEL,
        C.QTD

      ORDER BY UH.CODUH
    `;

    const { rows } = await db.query(sql, [idhotel]);
    const data = rows || [];

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'inline; filename="relatorio-mesas-por-uh-anonovo.pdf"'
    );

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    // Função para desenhar cabeçalho
    function drawHeader(showLogo = false) {
      let y = 40;

      if (showLogo) {
        try {
          const logoPath = path.join(__dirname, '../uploads/LogoZapChat.png');
          doc.image(logoPath, 40, 30, { width: 100, height: 40 });
        } catch (e) {
          console.log('Logo não encontrada');
        }

        doc.font('Helvetica-Bold').fontSize(16);
        doc.text('Relatório - Mesas por UH (Ano Novo)', 150, 40, { align: 'left' });

        doc.font('Helvetica').fontSize(10);
        doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 150, 60);

        y = 100;
      }

      // Cabeçalho da tabela
      doc.font('Helvetica-Bold').fontSize(10);

      // Fundo cinza do cabeçalho
      doc.rect(40, y, 515, 25).fillAndStroke('#EEEEEE', '#000000');

      // Texto do cabeçalho
      doc.fillColor('#000000');
      doc.text('UH', 50, y + 8, { width: 60, continued: false });
      doc.text('Mesas', 120, y + 8, { width: 260, continued: false });
      doc.text('Qtd', 390, y + 8, { width: 60, align: 'center', continued: false });
      doc.text('Compareceu', 460, y + 8, { width: 85, align: 'center', continued: false });

      doc.font('Helvetica');
      return y + 25;
    }

    // Desenha primeira página com logo
    let currentY = drawHeader(true);

    const bottomMargin = 60;
    const lineHeight = 15;

    // Loop dos dados
    data.forEach((r, index) => {
      const coduh = r.CODUH ?? r.coduh ?? '';
      
      // Concatena mesas
      const mesas = [
        r.MESA1 ?? r.mesa1 ?? '',
        r.MESA2 ?? r.mesa2 ?? '',
        r.MESA3 ?? r.mesa3 ?? '',
        r.MESA4 ?? r.mesa4 ?? '',
        r.MESA5 ?? r.mesa5 ?? '',
        r.MESA6 ?? r.mesa6 ?? ''
      ].filter(x => x && x !== '').join(', ');

      const quantidade = r.QUANTIDADE ?? r.quantidade ?? 0;

      // Observações
      const obsText = [
        r.OBS1 ?? r.obs1 ?? '',
        r.OBS2 ?? r.obs2 ?? '',
        r.OBS3 ?? r.obs3 ?? '',
        r.OBS4 ?? r.obs4 ?? '',
        r.OBS5 ?? r.obs5 ?? '',
        r.OBS6 ?? r.obs6 ?? ''
      ].filter(x => x && String(x).trim() !== '').join(' | ');

      // Calcula altura do texto de mesas
      doc.fontSize(10);
      const mesasTextHeight = doc.heightOfString(mesas || '-', { 
        width: 260 
      });

      // Calcula altura das observações
      let obsTextHeight = 0;
      if (obsText) {
        doc.fontSize(8);
        obsTextHeight = doc.heightOfString(`Obs: ${obsText}`, { 
          width: 420 
        }) + 6;
      }

      // Altura total necessária para o registro
      const rowHeight = Math.max(lineHeight, mesasTextHeight + 6) + obsTextHeight;

      // Verifica se precisa de nova página
      if (currentY + rowHeight > doc.page.height - bottomMargin) {
        doc.addPage();
        currentY = drawHeader(false);
      }

      const rowStartY = currentY;

      // Desenha bordas da linha
      doc.rect(40, rowStartY, 515, rowHeight).stroke('#CCCCCC');

      // Linhas verticais para separar colunas
      doc.moveTo(110, rowStartY).lineTo(110, rowStartY + rowHeight).stroke('#CCCCCC');
      doc.moveTo(380, rowStartY).lineTo(380, rowStartY + rowHeight).stroke('#CCCCCC');
      doc.moveTo(450, rowStartY).lineTo(450, rowStartY + rowHeight).stroke('#CCCCCC');

      // Escreve conteúdo da linha
      doc.fillColor('#000000').fontSize(10);
      
      // UH
      doc.text(String(coduh), 50, rowStartY + 5, { 
        width: 60, 
        continued: false 
      });

      // Mesas
      doc.text(mesas || '-', 120, rowStartY + 5, { 
        width: 260, 
        continued: false 
      });

      // Observações (se existirem) - logo abaixo das mesas
      if (obsText) {
        const obsY = rowStartY + mesasTextHeight + 8;
        doc.fontSize(8).fillColor('#555555');
        doc.text(`Obs: ${obsText}`, 120, obsY, { 
          width: 260, 
          continued: false 
        });
      }

      // Quantidade
      doc.text(String(quantidade || '0'), 390, rowStartY + 5, { 
        width: 60, 
        align: 'center', 
        continued: false 
      });

      // Coluna Compareceu (vazia)
      doc.text('', 460, rowStartY + 5, { 
        width: 85, 
        align: 'center', 
        continued: false 
      });

      // Move para próxima linha
      currentY += rowHeight;
    });

    doc.end();

  } catch (err) {
    console.error('Erro ao gerar relatorio mesas-por-uh (Ano Novo):', err);
    res
      .status(500)
      .json({ error: 'Falha ao gerar relatório de mesas por UH (Ano Novo).' });
  }
});

module.exports = router;