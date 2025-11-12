const express = require('express');
const router = express.Router();
const { getOracle } = require('../config/oracle');

// GET /natal/reservas
router.get('/reservas', async (req, res) => {
  try {
    const { checkin, checkout, nome, coduh } = req.query;
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const size = Math.min(Math.max(parseInt(req.query.size || '10', 10), 1), 100);
    const offset = (page - 1) * size;

    if (!checkin && !checkout && !nome && !coduh) {
      return res.status(400).json({ error: 'Informe ao menos um filtro: checkin, checkout, nome ou coduh.' });
    }

    const conditions = [
      "RV.IDRESERVASFRONT = MH.IDRESERVASFRONT",
      "MH.IDHOSPEDE = H.IDHOSPEDE",
      "MH.PRINCIPAL = 'S'",
      "RV.STATUSRESERVA = 2"
    ];
    const params = [];

    if (checkin) {
      conditions.push('TRUNC(RV.DATACHEGPREVISTA) >= TRUNC(?)');
      params.push(new Date(checkin));
    }
    if (checkout) {
      conditions.push('TRUNC(RV.DATAPARTPREVISTA) <= TRUNC(?)');
      params.push(new Date(checkout));
    }
    if (nome) {
      conditions.push("UPPER(H.NOME || ' ' || H.SOBRENome) LIKE ?");
      params.push('%' + String(nome).toUpperCase() + '%');
    }
    if (coduh) {
      conditions.push('UPPER(RV.CODUH) LIKE ?');
      params.push('%' + String(coduh).toUpperCase() + '%');
    }

    const baseSql = `
      SELECT RV.IDRESERVASFRONT, RV.NUMRESERVA, RV.CODUH,
             RV.DATACHEGPREVISTA AS DATACHECKIN,
             RV.DATAPARTPREVISTA AS DATACHECKOUT,
             H.NOME || ' ' || H.SOBRENOME AS NOMECOMPLETO
        FROM CM.RESERVASFRONT RV,
             CM.MOVIMENTOHOSPEDES MH,
             CM.HOSPEDE H
       WHERE ${conditions.join(' AND ')}
       ORDER BY RV.DATACHEGPREVISTA DESC
       OFFSET ? ROWS FETCH NEXT ? ROWS ONLY`;

    const totalSql = `
      SELECT COUNT(1) AS TOTAL
        FROM CM.RESERVASFRONT RV,
             CM.MOVIMENTOHOSPEDES MH,
             CM.HOSPEDE H
       WHERE ${conditions.join(' AND ')}`;

    const db = getOracle();
    const totalRes = await db.query(totalSql, params);
    const total = (totalRes.rows && totalRes.rows[0] && (totalRes.rows[0].TOTAL || totalRes.rows[0].total)) || 0;

    const dataParams = [...params, offset, size];
    const { rows } = await db.query(baseSql, dataParams);

    const data = (rows || []).map((r) => ({
      id: r.IDRESERVASFRONT ?? r.idreservasfront ?? r.ID ?? r.id,
      numreserva: r.NUMRESERVA ?? r.numreserva,
      coduh: r.CODUH ?? r.coduh,
      data_checkin: r.DATACHECKIN ?? r.datacheckin ?? r.DATA_CHECKIN ?? r.data_checkin,
      data_checkout: r.DATACHECKOUT ?? r.datacheckout ?? r.DATA_CHECKOUT ?? r.data_checkout,
      nome_hospede: r.NOMECOMPLETO ?? r.nomecompleto ?? r.NOME_HOSPEDE ?? r.nome_hospede
    }))

    res.json({ data, total, page, size });
  } catch (err) {
    console.error('Erro ao buscar reservas no Oracle:', err);
    res.status(500).json({ error: 'Falha ao consultar reservas.' });
  }
});

// GET /natal/mesas — ocupação das mesas
router.get('/mesas', async (req, res) => {
  try {
    const sql = `
      SELECT EM.IDMARCACAOMESA, EM.NUMMESA, EM.ORDEM,
             (SELECT COUNT(EI.IDMARCACAOITEM)
                FROM CM.ENOMARCACAOITEM EI
               WHERE EM.IDMARCACAOMESA = EI.IDMARCACAOMESA
                 AND EI.STATUS = 1) OCUPADOS,
             EM.QUANTIDADE QUANTIDADETOTAL
        FROM CM.ENOMARCACAOMESA EM`;
    const db = getOracle();
    const { rows } = await db.query(sql, []);
    const data = (rows || []).map(r => ({
      idmarcacaomesa: r.IDMARCACAOMESA ?? r.idmarcacaomesa,
      nummesa: r.NUMMESA ?? r.nummesa,
      ordem: r.ORDEM ?? r.ordem,
      ocupados: r.OCUPADOS ?? r.ocupados,
      quantidadetotal: r.QUANTIDADETOTAL ?? r.quantidadetotal
    }));
    res.json({ data });
  } catch (err) {
    console.error('Erro ao buscar mesas no Oracle:', err);
    res.status(500).json({ error: 'Falha ao consultar mesas.' });
  }
});

// GET /natal/mesas/:id/reservas — reservas vinculadas à mesa
router.get('/mesas/:id/reservas', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID de mesa inválido' });
    }
    const db = getOracle();
    // Consulta conforme especificado pelo cliente
    const sql = `
      SELECT DISTINCT EI.IDMARCACAOMESA,
             H.NOME || ' ' || H.SOBRENOME  AS NOMECOMPLETO,
             RV.CODUH,
             (SELECT COUNT(EII.IDMARCACAOITEM)
                FROM CM.ENOMARCACAOITEM EII
               WHERE EM.IDMARCACAOMESA = EII.IDMARCACAOMESA
                 AND EII.STATUS = 1) AS RESERVAS
        FROM CM.ENOMARCACAOMESA EM,
             CM.ENOMARCACAOITEM EI,
             CM.RESERVASFRONT RV,
             CM.MOVIMENTOHOSPEDES MH,
             CM.HOSPEDE H
       WHERE EM.IDMARCACAOMESA = EI.IDMARCACAOMESA
         AND EI.STATUS = 1
         AND RV.IDRESERVASFRONT = MH.IDRESERVASFRONT
         AND MH.IDHOSPEDE = H.IDHOSPEDE
         AND MH.PRINCIPAL = 'S'
         AND RV.STATUSRESERVA = 2
         AND RV.IDRESERVASFRONT = EI.IDRESERVASFRONT
         AND EM.IDMARCACAOMESA = ?`;
    const { rows } = await db.query(sql, [id]);
    const data = (rows || []).map(r => ({
      idmarcacaomesa: r.IDMARCACAOMESA ?? r.idmarcacaomesa,
      nome_hospede: r.NOMECOMPLETO ?? r.nomecompleto,
      coduh: r.CODUH ?? r.coduh,
      reservas: r.RESERVAS ?? r.reservas
    }));
    res.json({ data });
  } catch (err) {
    console.error('Erro ao buscar reservas por mesa:', err);
    res.status(500).json({ error: 'Falha ao consultar reservas por mesa.' });
  }
});

// POST /natal/marcacoes — marcar itens livres da mesa para a reserva
router.post('/marcacoes', async (req, res) => {
  try {
    const { idreservasfront, quantidade, idmarcacaomesa, observacao } = req.body || {};
    if (!idreservasfront || !idmarcacaomesa || !quantidade || quantidade <= 0) {
      return res.status(400).json({ error: 'Parâmetros inválidos. Envie idreservasfront, idmarcacaomesa e quantidade (>0).' });
    }

    const db = getOracle();

    const countSql = `
      SELECT COUNT(1) AS DISPONIVEIS
        FROM CM.ENOMARCACAOITEM
       WHERE IDMARCACAOMESA = ?
         AND (IDRESERVASFRONT IS NULL OR IDRESERVASFRONT = 0)
         AND (STATUS IS NULL OR STATUS <> 1)
    `;
    const countRes = await db.query(countSql, [idmarcacaomesa]);
    const disponiveis = (countRes.rows && countRes.rows[0] && (countRes.rows[0].DISPONIVEIS || countRes.rows[0].disponiveis)) || 0;
    if (quantidade > disponiveis) {
      return res.status(409).json({ error: 'Quantidade solicitada excede a disponibilidade da mesa.', disponiveis });
    }

    const idsSql = `
      SELECT IDMARCACAOITEM
        FROM CM.ENOMARCACAOITEM
       WHERE IDMARCACAOMESA = ?
         AND (IDRESERVASFRONT IS NULL OR IDRESERVASFRONT = 0)
         AND (STATUS IS NULL OR STATUS <> 1)
       ORDER BY IDMARCACAOITEM
       FETCH NEXT ? ROWS ONLY
    `;
    const idsRes = await db.query(idsSql, [idmarcacaomesa, quantidade]);
    const itens = (idsRes.rows || []).map(r => r.IDMARCACAOITEM || r.idmarcacaoitem).filter(Boolean);

    let atualizados = 0;
    for (const itemId of itens) {
      const updSql = `
        UPDATE CM.ENOMARCACAOITEM
           SET IDRESERVASFRONT = ?,
               STATUS = 1,
               DESCRICAO = ?
         WHERE IDMARCACAOITEM = ?
           AND (IDRESERVASFRONT IS NULL OR IDRESERVASFRONT = 0)
           AND (STATUS IS NULL OR STATUS <> 1)
      `;
      const resp = await db.query(updSql, [idreservasfront, observacao || null, itemId]);
      atualizados += resp.rowCount || 0;
    }

    return res.json({ ok: true, atualizados, solicitados: quantidade });
  } catch (err) {
    console.error('Erro ao salvar marcação:', err);
    res.status(500).json({ error: 'Falha ao salvar marcação.' });
  }
});

module.exports = router;
