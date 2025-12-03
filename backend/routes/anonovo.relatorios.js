const express = require('express');
const router = express.Router();
const { getOracle } = require('../config/oracle');
const PDFDocument = require('pdfkit');

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
                JOIN RESERVASFRONT RF 
                    ON RF.IDRESERVASFRONT = EI.IDRESERVASFRONT
            ),

            -- 2) Contagem bruta (igual a sua)
            CONTAGEM AS (
                SELECT 
                    RF.CODUH,
                    COUNT(*) AS QTD
                FROM CM.ENOMARCACAOMESAANO EM
                JOIN CM.ENOMARCACAOITEMANO EI 
                    ON EI.IDMARCACAOMESA = EM.IDMARCACAOMESA
                JOIN RESERVASFRONT RF 
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

            FROM UH
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

    const PDFDocument = require('pdfkit');
    const path = require('path');

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    // ----------------------------------------------
    // 1. Cabeçalho com logo
    // ----------------------------------------------
    function drawHeader(showLogo = false) {
      let y = 40;

      if (showLogo) {
        try {
          const logoPath = path.join(__dirname, '../uploads/LogoZapChat.png');
          doc.image(logoPath, 20, 25, { width: 120, height: 50 });
        } catch (e) { }

        doc.font('Helvetica-Bold').fontSize(16);
        doc.text('Relatório - Mesas por UH (Ano Novo)', 200, 45);

        doc.font('Helvetica').fontSize(10);
        doc.text(`Gerado em: ${new Date().toLocaleString()}`, 200, 70);

        y = 120;
      }

      // Cabeçalho da tabela
      doc.font('Helvetica-Bold').fontSize(11);

      doc.rect(40, y, 500, 20).fill('#EEEEEE').stroke(); // fundo cinza claro

      doc.fillColor('#000000');
      doc.text('UH', 50, y + 5);
      doc.text('Mesas', 150, y + 5);
      doc.text('Qtd', 440 - 10, y + 5);
      doc.text('Compareceu', 480 - 10, y + 5);

      return y + 20;
    }

    // ----------------------------------------------
    // 2. Primeira página
    // ----------------------------------------------
    let y = drawHeader(true);

    // Colunas
    const colUH = 50;
    const colMesas = 150;
    const colQtd = 440 - 10;

    // ----------------------------------------------
    // 3. Loop dos dados com tabela
    // ----------------------------------------------
    data.forEach((r, indexTotal) => {

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
        r.OBS1, r.OBS2, r.OBS3, r.OBS4, r.OBS5, r.OBS6
      ].filter(x => x && String(x).trim() !== '').join(' | ');

      // ------------------------------------------
      // CALCULA ALTURA DINÂMICA
      // ------------------------------------------
      const mesasHeight = doc.heightOfString(mesas, { width: 300 });
      const obsHeight = obsText ? doc.heightOfString(`Obs: ${obsText}`, { width: 300 }) + 4 : 0;

      const rowHeight = Math.max(20, mesasHeight) + obsHeight + 4;

      // ------------------------------------------
      // VERIFICA SE PRECISA DE NOVA PÁGINA
      // ------------------------------------------
      if (y + rowHeight > 760) {
        doc.addPage();
        y = drawHeader(false); // redesenha cabeçalho da tabela
      }

      // ------------------------------------------
      // DESENHA A LINHA DA TABELA (FUNDO + BORDA)
      // ------------------------------------------
      const zebra = (indexTotal % 2 === 0) ? '#F7F7F7' : '#FFFFFF';
      doc.rect(40, y, 500, rowHeight).stroke();

      // ------------------------------------------
      // ESCREVE TEXTO DA LINHA
      // ------------------------------------------
      doc.fillColor('#000').fontSize(10);

      doc.text(String(r.CODUH ?? r.coduh), 50, y + 5);
      doc.text(mesas, 150, y + 5, { width: 300 });
      doc.text(String(quantidade), 490, y + 5);

      // ------------------------------------------
      // ESCREVE OBSERVAÇÃO LOGO ABAIXO
      // ------------------------------------------
      if (obsText) {
        doc.fontSize(8).fillColor('#444');
        doc.text(`Obs: ${obsText}`, 150, y + mesasHeight + 8, { width: 300 });
        doc.fontSize(10).fillColor('#000');
      }

      // ------------------------------------------
      // MOVE PARA PRÓXIMA LINHA
      // ------------------------------------------
      y += rowHeight + 2;
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
