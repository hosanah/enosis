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
      WITH DISTINCT_MESAS AS (
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
      ENUMERADA AS (
        SELECT 
            CODUH,
            IDHOTEL,
            NUMMESA,
            DESCRICAO,
            ROW_NUMBER() OVER (PARTITION BY CODUH ORDER BY NUMMESA) AS RN
        FROM DISTINCT_MESAS
      )
      SELECT
          UH.CODUH,
          UH.IDHOTEL,

          MAX(CASE WHEN E.RN = 1 THEN E.NUMMESA END) AS MESA1,
          MAX(CASE WHEN E.RN = 2 THEN E.NUMMESA END) AS MESA2,
          MAX(CASE WHEN E.RN = 3 THEN E.NUMMESA END) AS MESA3,
          MAX(CASE WHEN E.RN = 4 THEN E.NUMMESA END) AS MESA4,
          MAX(CASE WHEN E.RN = 5 THEN E.NUMMESA END) AS MESA5,
          MAX(CASE WHEN E.RN = 6 THEN E.NUMMESA END) AS MESA6,

          (SELECT COUNT(*)
             FROM DISTINCT_MESAS X 
            WHERE X.CODUH = UH.CODUH) AS QUANTIDADE,

          MAX(CASE WHEN E.RN = 1 THEN E.DESCRICAO END) AS OBS1,
          MAX(CASE WHEN E.RN = 2 THEN E.DESCRICAO END) AS OBS2,
          MAX(CASE WHEN E.RN = 3 THEN E.DESCRICAO END) AS OBS3,
          MAX(CASE WHEN E.RN = 4 THEN E.DESCRICAO END) AS OBS4,
          MAX(CASE WHEN E.RN = 5 THEN E.DESCRICAO END) AS OBS5,
          MAX(CASE WHEN E.RN = 6 THEN E.DESCRICAO END) AS OBS6

      FROM CM.UH UH
      LEFT JOIN ENUMERADA E 
        ON E.CODUH = UH.CODUH
      WHERE UH.UHPOOL = 'S'
        AND UH.IDHOTEL = ?
      GROUP BY UH.CODUH, UH.IDHOTEL
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

    doc.fontSize(14).text('Relatório - Mesas por UH (Ano Novo)', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Hotel: ${idhotel}`, { align: 'left' });
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, { align: 'left' });
    doc.moveDown();

    // Cabeçalho da tabela
    doc.font('Helvetica-Bold');
    doc.text('UH', { continued: true, width: 60 });
    doc.text('Mesa1', { continued: true, width: 40 });
    doc.text('Mesa2', { continued: true, width: 40 });
    doc.text('Mesa3', { continued: true, width: 40 });
    doc.text('Mesa4', { continued: true, width: 40 });
    doc.text('Mesa5', { continued: true, width: 40 });
    doc.text('Mesa6', { continued: true, width: 40 });
    doc.text('Qtd', { width: 30 });
    doc.moveDown(0.5);
    doc.font('Helvetica');

    data.forEach((r) => {
      const coduh = r.CODUH ?? r.coduh ?? '';
      const mesa1 = r.MESA1 ?? r.mesa1 ?? '';
      const mesa2 = r.MESA2 ?? r.mesa2 ?? '';
      const mesa3 = r.MESA3 ?? r.mesa3 ?? '';
      const mesa4 = r.MESA4 ?? r.mesa4 ?? '';
      const mesa5 = r.MESA5 ?? r.mesa5 ?? '';
      const mesa6 = r.MESA6 ?? r.mesa6 ?? '';
      const quantidade = r.QUANTIDADE ?? r.quantidade ?? 0;

      doc.text(String(coduh), { continued: true, width: 60 });
      doc.text(String(mesa1 || ''), { continued: true, width: 40 });
      doc.text(String(mesa2 || ''), { continued: true, width: 40 });
      doc.text(String(mesa3 || ''), { continued: true, width: 40 });
      doc.text(String(mesa4 || ''), { continued: true, width: 40 });
      doc.text(String(mesa5 || ''), { continued: true, width: 40 });
      doc.text(String(mesa6 || ''), { continued: true, width: 40 });
      doc.text(String(quantidade || ''), { width: 30 });

      // Observações em linha abaixo, se existirem
      const obs1 = r.OBS1 ?? r.obs1 ?? '';
      const obs2 = r.OBS2 ?? r.obs2 ?? '';
      const obs3 = r.OBS3 ?? r.obs3 ?? '';
      const obs4 = r.OBS4 ?? r.obs4 ?? '';
      const obs5 = r.OBS5 ?? r.obs5 ?? '';
      const obs6 = r.OBS6 ?? r.obs6 ?? '';
      const obsText = [obs1, obs2, obs3, obs4, obs5, obs6]
        .filter((x) => x && String(x).trim() !== '')
        .join(' | ');

      if (obsText) {
        doc.moveDown(0.1);
        doc.fontSize(8).text(`Obs: ${obsText}`, { indent: 10 });
        doc.fontSize(10);
      }

      doc.moveDown(0.3);
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
