const express = require('express');
const router = express.Router();
const { getOracle } = require('../config/oracle');
const PDFDocument = require('pdfkit');
const path = require('path');

// GET /natal/relatorios/mesas-por-uh
// RelatÃ³rio PDF: listagem de mesas por UH (Natal)
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
        FROM CM.ENOMARCACAOMESA EM
        JOIN CM.ENOMARCACAOITEM EI 
          ON EI.IDMARCACAOMESA = EM.IDMARCACAOMESA
        JOIN CM.RESERVASFRONT RF 
          ON RF.IDRESERVASFRONT = EI.IDRESERVASFRONT
      ),

      -- 2) Contagem bruta
      CONTAGEM AS (
        SELECT 
          RF.CODUH,
          COUNT(*) AS QTD
        FROM CM.ENOMARCACAOMESA EM
        JOIN CM.ENOMARCACAOITEM EI 
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
      'inline; filename="relatorio-mesas-por-uh-natal.pdf"'
    );

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    // FunÃ§Ã£o para desenhar cabeÃ§alho
    function drawHeader(showLogo = false) {
      let y = 40;

      if (showLogo) {
        try {
          const logoPath = path.join(__dirname, '../uploads/LogoZapChat.png');
          doc.image(logoPath, 40, 30, { width: 100, height: 40 });
        } catch (e) {
          console.log('Logo nÃ£o encontrada');
        }

        doc.font('Helvetica-Bold').fontSize(16);
        doc.text('RelatÃ³rio - Mesas por UH (Natal)', 150, 40, { align: 'left' });

        doc.font('Helvetica').fontSize(10);
        doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 150, 60);

        y = 100;
      }

      // CabeÃ§alho da tabela
      doc.font('Helvetica-Bold').fontSize(10);

      // Fundo cinza do cabeÃ§alho
      doc.rect(40, y, 515, 25).fillAndStroke('#EEEEEE', '#000000');

      // Texto do cabeÃ§alho
      doc.fillColor('#000000');
      doc.text('UH', 50, y + 8, { width: 60, continued: false });
      doc.text('Mesas', 120, y + 8, { width: 260, continued: false });
      doc.text('Qtd', 390, y + 8, { width: 60, align: 'center', continued: false });
      doc.text('Compareceu', 460, y + 8, { width: 85, align: 'center', continued: false });

      doc.font('Helvetica');
      return y + 25;
    }

    // Desenha primeira pÃ¡gina com logo
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

      // Calcula altura das Observações
      let obsTextHeight = 0;
      if (obsText) {
        doc.fontSize(8);
        obsTextHeight = doc.heightOfString(`Obs: ${obsText}`, { 
          width: 420 
        }) + 6;
      }

      // Altura total necessÃ¡ria para o registro
      const rowHeight = Math.max(lineHeight, mesasTextHeight + 6) + obsTextHeight;

      // Verifica se precisa de nova pÃ¡gina
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

      // Escreve conteÃºdo da linha
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

      // Move para prÃ³xima linha
      currentY += rowHeight;
    });

    doc.end();

  } catch (err) {
    console.error('Erro ao gerar relatorio mesas-por-uh (Natal):', err);
    res
      .status(500)
      .json({ error: 'Falha ao gerar relatÃ³rio de mesas por UH (Natal).' });
  }
});

// GET /natal/relatorios/uh-por-mesa
// RelatÃ³rio PDF: listagem de UHs por mesa (Natal)
router.get('/uh-por-mesa', async (req, res) => {
  try {
    const db = getOracle();
    const idhotel = Number(req.query.idhotel || 1);

    const sql = `
      -- 1) UHs distintas por mesa
      WITH UHS AS (
          SELECT DISTINCT
              EM.NUMMESA,
              EM.ORDEM,
              RF.CODUH,
              EI.DESCRICAO
          FROM CM.ENOMARCACAOMESA EM
          JOIN CM.ENOMARCACAOITEM EI 
            ON EI.IDMARCACAOMESA = EM.IDMARCACAOMESA
          JOIN CM.RESERVASFRONT RF 
            ON RF.IDRESERVASFRONT = EI.IDRESERVASFRONT
          WHERE RF.IDHOTEL = ?
      ),

      -- 2) Contagem de UHs por mesa
      CONTAGEM AS (
          SELECT 
              EM.NUMMESA,
              EM.ORDEM,
              COUNT(DISTINCT RF.CODUH) AS QTD
          FROM CM.ENOMARCACAOMESA EM
          JOIN CM.ENOMARCACAOITEM EI 
            ON EI.IDMARCACAOMESA = EM.IDMARCACAOMESA
          JOIN CM.RESERVASFRONT RF 
            ON RF.IDRESERVASFRONT = EI.IDRESERVASFRONT
          WHERE RF.IDHOTEL = ?
          GROUP BY EM.NUMMESA, EM.ORDEM
      ),

      -- 3) UHs numeradas dentro de cada mesa
      UHS_RN AS (
          SELECT
              NUMMESA,
              ORDEM,
              CODUH,
              DESCRICAO,
              ROW_NUMBER() OVER (
                  PARTITION BY NUMMESA ORDER BY CODUH
              ) AS RN
          FROM UHS
      )

      SELECT
          M.NUMMESA,
          M.ORDEM,

          MAX(CASE WHEN U.RN = 1 THEN U.CODUH END) AS UH1,
          MAX(CASE WHEN U.RN = 2 THEN U.CODUH END) AS UH2,
          MAX(CASE WHEN U.RN = 3 THEN U.CODUH END) AS UH3,
          MAX(CASE WHEN U.RN = 4 THEN U.CODUH END) AS UH4,
          MAX(CASE WHEN U.RN = 5 THEN U.CODUH END) AS UH5,
          MAX(CASE WHEN U.RN = 6 THEN U.CODUH END) AS UH6,

          C.QTD AS QUANTIDADE,

          MAX(CASE WHEN U.RN = 1 THEN U.DESCRICAO END) AS OBS1,
          MAX(CASE WHEN U.RN = 2 THEN U.DESCRICAO END) AS OBS2,
          MAX(CASE WHEN U.RN = 3 THEN U.DESCRICAO END) AS OBS3,
          MAX(CASE WHEN U.RN = 4 THEN U.DESCRICAO END) AS OBS4,
          MAX(CASE WHEN U.RN = 5 THEN U.DESCRICAO END) AS OBS5,
          MAX(CASE WHEN U.RN = 6 THEN U.DESCRICAO END) AS OBS6

      FROM CM.ENOMARCACAOMESA M
      LEFT JOIN UHS_RN U ON U.NUMMESA = M.NUMMESA
      LEFT JOIN CONTAGEM C ON C.NUMMESA = M.NUMMESA AND C.ORDEM = M.ORDEM

      GROUP BY 
          M.NUMMESA,
          M.ORDEM,
          C.QTD

      ORDER BY 
          M.ORDEM,
          M.NUMMESA
    `;

    const { rows } = await db.query(sql, [idhotel, idhotel]);
    const data = rows || [];

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'inline; filename="relatorio-uh-por-mesa-natal.pdf"'
    );

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    function drawHeader(showLogo = false) {
      let y = 40;

      if (showLogo) {
        try {
          const logoPath = path.join(__dirname, '../uploads/LogoZapChat.png');
          doc.image(logoPath, 40, 30, { width: 100, height: 40 });
        } catch (e) {
          console.log('Logo nÃ£o encontrada');
        }

        doc.font('Helvetica-Bold').fontSize(16);
        doc.text('RelatÃ³rio - UHs por Mesa (Natal)', 150, 40, { align: 'left' });

        doc.font('Helvetica').fontSize(10);
        doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 150, 60);

        y = 100;
      }

      doc.font('Helvetica-Bold').fontSize(10);
      doc.rect(40, y, 515, 25).fillAndStroke('#EEEEEE', '#000000');

      doc.fillColor('#000000');
      doc.text('Mesa', 50, y + 8, { width: 60, continued: false });
      doc.text('UHs', 120, y + 8, { width: 220, continued: false });
      doc.text('Qtd UHs', 360, y + 8, { width: 70, align: 'center', continued: false });
      doc.text('Observações', 440, y + 8, { width: 100, align: 'center', continued: false });

      doc.font('Helvetica');
      return y + 25;
    }

    let currentY = drawHeader(true);
    const bottomMargin = 60;
    const lineHeight = 15;

    data.forEach((r) => {
      const mesa = r.NUMMESA ?? r.nummesa ?? '';

      const uhsText = [
        r.UH1 ?? r.uh1 ?? '',
        r.UH2 ?? r.uh2 ?? '',
        r.UH3 ?? r.uh3 ?? '',
        r.UH4 ?? r.uh4 ?? '',
        r.UH5 ?? r.uh5 ?? '',
        r.UH6 ?? r.uh6 ?? ''
      ].filter((x) => x && String(x).trim() !== '').join(', ');

      const quantidade = r.QUANTIDADE ?? r.quantidade ?? 0;

      const obsText = [
        r.OBS1 ?? r.obs1 ?? '',
        r.OBS2 ?? r.obs2 ?? '',
        r.OBS3 ?? r.obs3 ?? '',
        r.OBS4 ?? r.obs4 ?? '',
        r.OBS5 ?? r.obs5 ?? '',
        r.OBS6 ?? r.obs6 ?? ''
      ].filter((x) => x && String(x).trim() !== '').join(' | ');

      doc.fontSize(10);
      const uhsHeight = doc.heightOfString(uhsText || '-', { width: 220 });

      let obsHeight = 0;
      if (obsText) {
        doc.fontSize(8);
        obsHeight = doc.heightOfString(`Obs: ${obsText}`, { width: 100 }) + 6;
      }

      const rowHeight = Math.max(lineHeight, uhsHeight + 6) + obsHeight;

      if (currentY + rowHeight > doc.page.height - bottomMargin) {
        doc.addPage();
        currentY = drawHeader(false);
      }

      const rowStartY = currentY;
      doc.rect(40, rowStartY, 515, rowHeight).stroke('#CCCCCC');

      doc.moveTo(110, rowStartY).lineTo(110, rowStartY + rowHeight).stroke('#CCCCCC');
      doc.moveTo(360, rowStartY).lineTo(360, rowStartY + rowHeight).stroke('#CCCCCC');
      doc.moveTo(430, rowStartY).lineTo(430, rowStartY + rowHeight).stroke('#CCCCCC');

      doc.fillColor('#000000').fontSize(10);
      doc.text(String(mesa), 50, rowStartY + 5, { width: 60, continued: false });
      doc.text(uhsText || '-', 120, rowStartY + 5, { width: 230, continued: false });
      doc.text(String(quantidade || '0'), 365, rowStartY + 5, { width: 60, align: 'center', continued: false });

      if (obsText) {
        const obsY = rowStartY + uhsHeight + 8;
        doc.fontSize(8).fillColor('#555555');
        doc.text(`Obs: ${obsText}`, 440, obsY, { width: 100, continued: false });
      }

      currentY += rowHeight;
    });

    doc.end();

  } catch (err) {
    console.error('Erro ao gerar relatorio uh-por-mesa (Natal):', err);
    res
      .status(500)
      .json({ error: 'Falha ao gerar relatÃ³rio de UH por mesa (Natal).' });
  }
});

module.exports = router;
