const express = require('express');
const router = express.Router();
const { getOracle } = require('../config/oracle');
const { getAuthDb } = require('../config/authdb');

// GET /natal/reservas
router.get('/reservas', async (req, res) => {
  try {
    const { checkin, checkout, nome, coduh } = req.query;
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const size = Math.min(Math.max(parseInt(req.query.size || '10', 10), 1), 100);
    const offset = (page - 1) * size;

    if (!checkin && !checkout && !nome && !coduh) {
      return res
        .status(400)
        .json({ error: 'Informe ao menos um filtro: checkin, checkout, nome ou coduh.' });
    }

    const conditions = [
      'RV.IDRESERVASFRONT = MH.IDRESERVASFRONT',
      'MH.IDHOSPEDE = H.IDHOSPEDE',
      "MH.PRINCIPAL = 'S'",
      'RV.STATUSRESERVA = 2'
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
      conditions.push("UPPER(H.NOME || ' ' || H.SOBRENOME) LIKE ?");
      params.push('%' + String(nome).toUpperCase() + '%');
    }
    if (coduh) {
      conditions.push('UPPER(RV.CODUH) LIKE ?');
      params.push('%' + String(coduh).toUpperCase() + '%');
    }

    const baseSql = `
      SELECT RV.IDRESERVASFRONT,
             RV.NUMRESERVA,
             RV.CODUH,
             RV.DATACHEGPREVISTA AS DATACHECKIN,
             RV.DATAPARTPREVISTA AS DATACHECKOUT,
             H.NOME || ' ' || H.SOBRENOME AS NOMECOMPLETO,
             (SELECT COUNT(MH2.IDHOSPEDE)
                FROM CM.MOVIMENTOHOSPEDES MH2
               WHERE MH2.IDRESERVASFRONT = RV.IDRESERVASFRONT) AS TOTALHOSPEDES
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
    const total =
      (totalRes.rows &&
        totalRes.rows[0] &&
        (totalRes.rows[0].TOTAL || totalRes.rows[0].total)) ||
      0;

    const dataParams = [...params, offset, size];
    const { rows } = await db.query(baseSql, dataParams);

    const data = (rows || []).map((r) => ({
      id: r.IDRESERVASFRONT ?? r.idreservasfront ?? r.ID ?? r.id,
      numreserva: r.NUMRESERVA ?? r.numreserva,
      coduh: r.CODUH ?? r.coduh,
      data_checkin:
        r.DATACHECKIN ?? r.datacheckin ?? r.DATA_CHECKIN ?? r.data_checkin,
      data_checkout:
        r.DATACHECKOUT ?? r.datacheckout ?? r.DATA_CHECKOUT ?? r.data_checkout,
      nome_hospede:
        r.NOMECOMPLETO ??
        r.nomecompleto ??
        r.NOME_HOSPEDE ??
        r.nome_hospede,
      total_hospedes: r.TOTALHOSPEDES ?? r.totalhospedes
    }));

    res.json({ data, total, page, size });
  } catch (err) {
    console.error('Erro ao buscar reservas no Oracle:', err);
    res.status(500).json({ error: 'Falha ao consultar reservas.' });
  }
});

// GET /natal/mesas - ocupacao das mesas
router.get('/mesas', async (req, res) => {
  try {
    const sql = `
      SELECT EM.IDMARCACAOMESA,
             EM.NUMMESA,
             EM.ORDEM,
             (SELECT COUNT(EI.IDMARCACAOITEM)
                FROM CM.ENOMARCACAOITEMANO EI
               WHERE EM.IDMARCACAOMESA = EI.IDMARCACAOMESA
                 AND EI.STATUS = 1) OCUPADOS,
             EM.QUANTIDADE QUANTIDADETOTAL
        FROM CM.ENOMARCACAOMESAANO EM`;
    const db = getOracle();
    const { rows } = await db.query(sql, []);
    const data = (rows || []).map((r) => ({
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

// GET /natal/mesas/:id/reservas - reservas vinculadas a mesa
router.get('/mesas/:id/reservas', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID de mesa invÃ¡lido.' });
    }
    const db = getOracle();
    // Consulta para exibir reservas/apartamentos da mesa com observacao
    const sql = `
      SELECT 
          EI.IDMARCACAOMESA,
          EI.IDRESERVASFRONT,
          RF.CODUH,
          EM.NUMMESA,
          H.NOME || ' ' || H.SOBRENOME AS NOMECOMPLETO,
          COUNT(EI.IDMARCACAOITEM) AS QUANTIDADE,
          MAX(EI.DESCRICAO) AS OBSERVACOES
        FROM CM.ENOMARCACAOITEMANO EI
        JOIN CM.ENOMARCACAOMESAANO EM ON EM.IDMARCACAOMESA = EI.IDMARCACAOMESA
        JOIN CM.RESERVASFRONT RF    ON RF.IDRESERVASFRONT = EI.IDRESERVASFRONT
        JOIN CM.MOVIMENTOHOSPEDES MH ON MH.IDRESERVASFRONT = RF.IDRESERVASFRONT
        JOIN CM.HOSPEDE H ON H.IDHOSPEDE = MH.IDHOSPEDE
       WHERE MH.PRINCIPAL = 'S'
         AND EM.IDMARCACAOMESA = ?
       GROUP BY 
          EI.IDMARCACAOMESA,
          EI.IDRESERVASFRONT,
          RF.CODUH,
          EM.NUMMESA,
          H.NOME || ' ' || H.SOBRENOME`;
    const { rows } = await db.query(sql, [id]);
    const data = (rows || []).map((r) => ({
      idreservasfront: r.IDRESERVASFRONT ?? r.idreservasfront,
      coduh: r.CODUH ?? r.coduh,
      nummesa: r.NUMMESA ?? r.nummesa,
      nome_hospede: r.NOMECOMPLETO ?? r.nomecompleto,
      quantidade: r.QUANTIDADE ?? r.quantidade,
      observacoes: r.OBSERVACOES ?? r.observacoes ?? null
    }));
    res.json({ data });
  } catch (err) {
    console.error('Erro ao buscar reservas por mesa:', err);
    res.status(500).json({ error: 'Falha ao consultar reservas por mesa.' });
  }
});


// GET /anonovo/marcacoes/reserva/:id - marcacoes existentes para a reserva (idreservasfront)
router.get('/marcacoes/reserva/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID da reserva invalido.' });
    }

    const db = getOracle();
    const sql = `
      SELECT 
        EI.IDRESERVASFRONT,
        EI.IDMARCACAOMESA,
        EM.NUMMESA,
        RF.NUMRESERVA,
        RF.CODUH,
        H.NOME || ' ' || H.SOBRENOME AS NOMECOMPLETO,
        COUNT(EI.IDMARCACAOITEM) AS QUANTIDADE,
        MAX(EI.DESCRICAO) AS OBSERVACOES
      FROM CM.ENOMARCACAOITEMANO EI
      JOIN CM.ENOMARCACAOMESAANO EM ON EM.IDMARCACAOMESA = EI.IDMARCACAOMESA
      JOIN CM.RESERVASFRONT RF ON RF.IDRESERVASFRONT = EI.IDRESERVASFRONT
      JOIN CM.MOVIMENTOHOSPEDES MH ON MH.IDRESERVASFRONT = RF.IDRESERVASFRONT
      JOIN CM.HOSPEDE H ON H.IDHOSPEDE = MH.IDHOSPEDE
      WHERE MH.PRINCIPAL = 'S'
        AND EI.IDRESERVASFRONT = ?
      GROUP BY 
        EI.IDRESERVASFRONT,
        EI.IDMARCACAOMESA,
        EM.NUMMESA,
        RF.NUMRESERVA,
        RF.CODUH,
        H.NOME || ' ' || H.SOBRENOME
    `;

    const { rows } = await db.query(sql, [id]);
    const data = (rows || []).map((r) => ({
      idreservasfront: r.IDRESERVASFRONT ?? r.idreservasfront,
      idmarcacaomesa: r.IDMARCACAOMESA ?? r.idmarcacaomesa,
      nummesa: r.NUMMESA ?? r.nummesa,
      numreserva: r.NUMRESERVA ?? r.numreserva,
      coduh: r.CODUH ?? r.coduh,
      nome_hospede: r.NOMECOMPLETO ?? r.nomecompleto,
      quantidade: r.QUANTIDADE ?? r.quantidade,
      observacoes: r.OBSERVACOES ?? r.observacoes ?? null
    }));

    return res.json({ data });
  } catch (err) {
    console.error('Erro ao buscar marcacoes da reserva:', err);
    res.status(500).json({ error: 'Falha ao consultar marcacoes da reserva.' });
  }
});

// POST /natal/marcacoes - marcar itens livres da mesa para a reserva
router.post('/marcacoes', async (req, res) => {
  try {
    const { idreservasfront, quantidade, idmarcacaomesa, observacao } = req.body || {};
    if (!idreservasfront || !idmarcacaomesa || !quantidade || quantidade <= 0) {
      return res.status(400).json({
        error:
          'ParÃ¢metros invÃ¡lidos. Envie idreservasfront, idmarcacaomesa e quantidade (>0).'
      });
    }

    const db = getOracle();
    const authDb = getAuthDb();

    // Diretriz PERMITIR_APTO_MULTI_RESERVAS:
    // quando desabilitada, nÃ£o permite que a mesma reserva/apartamento tenha mais de uma marcaÃ§Ã£o
    let permitirMultiReservas = false;
    try {
      const rows = await new Promise((resolve, reject) => {
        authDb.all(
          'SELECT code, habilitado FROM diretrizes WHERE code = ?',
          ['PERMITIR_APTO_MULTI_RESERVAS'],
          (err, result) => (err ? reject(err) : resolve(result || []))
        );
      });

      if (rows && rows.length > 0) {
        const d = rows[0];
        permitirMultiReservas =
          d.habilitado === 1 ||
          d.habilitado === '1' ||
          d.habilitado === true;
      }
    } catch (e) {
      console.error('Erro ao consultar diretriz PERMITIR_APTO_MULTI_RESERVAS:', e);
      // em caso de falha na leitura da diretriz, mantem o comportamento padrÃ£o (permitir)
    }

    if (permitirMultiReservas) {
      const existsSql = `
        SELECT COUNT(1) AS TOTAL
          FROM CM.ENOMARCACAOITEMANO
         WHERE IDRESERVASFRONT = ?
      `;
      const existsRes = await db.query(existsSql, [idreservasfront]);
      const totalExistentes =
        (existsRes.rows &&
          existsRes.rows[0] &&
          (existsRes.rows[0].TOTAL || existsRes.rows[0].total)) ||
        0;

      if (totalExistentes > 0) {
        return res.status(409).json({
          error:
            'JÃ¡ existe marcaÃ§Ã£o de mesa para esta reserva e as diretrizes do sistema nÃ£o permitem mÃºltiplas reservas para o mesmo apartamento.'
        });
      }
    }

      // Diretriz PERMITIR_QUANTIDADE_MAIOR_HOSPEDES:
      // quando desabilitada, nao permite quantidade maior que total de hospedes do apartamento
      let permitirQuantidadeMaiorHospedes = false;
      try {
        const rowsQtd = await new Promise((resolve, reject) => {
          authDb.all(
            'SELECT code, habilitado FROM diretrizes WHERE code = ?',
            ['PERMITIR_QUANTIDADE_MAIOR_HOSPEDES'],
            (err, result) => (err ? reject(err) : resolve(result || []))
          );
        });

        if (rowsQtd && rowsQtd.length > 0) {
          const d2 = rowsQtd[0];
          permitirQuantidadeMaiorHospedes =
            d2.habilitado === 1 ||
            d2.habilitado === '1' ||
            d2.habilitado === true;
        }
      } catch (e) {
        console.error('Erro ao consultar diretriz PERMITIR_QUANTIDADE_MAIOR_HOSPEDES:', e);
        // em caso de falha, mantem o comportamento padrao (nao bloquear)
      }

      if (!permitirQuantidadeMaiorHospedes) {
        const hospedesSql = `
          SELECT COUNT(MH2.IDHOSPEDE) AS TOTAL
            FROM CM.MOVIMENTOHOSPEDES MH2
           WHERE MH2.IDRESERVASFRONT = ?
        `;
        const hospRes = await db.query(hospedesSql, [idreservasfront]);
        const totalHospedes =
          (hospRes.rows &&
            hospRes.rows[0] &&
            (hospRes.rows[0].TOTAL || hospRes.rows[0].total)) ||
          0;

        if (quantidade > totalHospedes) {
          return res.status(409).json({
            error:
              'Quantidade solicitada e maior do que o numero de hospedes do apartamento e as diretrizes do sistema nao permitem isso.',
            totalHospedes
          });
        }
      }

      const countSql = `
      SELECT COUNT(1) AS DISPONIVEIS
        FROM CM.ENOMARCACAOITEMANO
       WHERE IDMARCACAOMESA = ?
         AND (IDRESERVASFRONT IS NULL OR IDRESERVASFRONT = 0)
         AND (STATUS IS NULL OR STATUS <> 1)
    `;
    const countRes = await db.query(countSql, [idmarcacaomesa]);
    const disponiveis =
      (countRes.rows &&
        countRes.rows[0] &&
        (countRes.rows[0].DISPONIVEIS || countRes.rows[0].disponiveis)) ||
      0;
    if (quantidade > disponiveis) {
      return res.status(409).json({
        error: 'Quantidade solicitada excede a disponibilidade da mesa.',
        disponiveis
      });
    }

    const idsSql = `
      SELECT IDMARCACAOITEM
        FROM CM.ENOMARCACAOITEMANO
       WHERE IDMARCACAOMESA = ?
         AND (IDRESERVASFRONT IS NULL OR IDRESERVASFRONT = 0)
         AND (STATUS IS NULL OR STATUS <> 1)
       ORDER BY IDMARCACAOITEM
       FETCH NEXT ? ROWS ONLY
    `;
    const idsRes = await db.query(idsSql, [idmarcacaomesa, quantidade]);
    const itens = (idsRes.rows || [])
      .map((r) => r.IDMARCACAOITEM || r.idmarcacaoitem)
      .filter(Boolean);

    let atualizados = 0;
    for (const itemId of itens) {
      const updSql = `
        UPDATE CM.ENOMARCACAOITEMANO
           SET IDRESERVASFRONT = ?,
               STATUS = 1,
               DESCRICAO = ?
         WHERE IDMARCACAOITEM = ?
           AND (IDRESERVASFRONT IS NULL OR IDRESERVASFRONT = 0)
           AND (STATUS IS NULL OR STATUS <> 1)
      `;
      const resp = await db.query(updSql, [
        idreservasfront,
        observacao || null,
        itemId
      ]);
      atualizados += resp.rowCount || 0;
    }

    return res.json({ ok: true, atualizados, solicitados: quantidade });
  } catch (err) {
    console.error('Erro ao salvar marcaÃ§Ã£o:', err);
    res.status(500).json({ error: 'Falha ao salvar marcaÃ§Ã£o.' });
  }
});

// POST /natal/marcacoes/cancelar - cancelar marcaÃ§Ãµes de uma reserva em uma mesa
router.post('/marcacoes/cancelar', async (req, res) => {
  try {
    const { idmarcacaomesa, idreservasfront } = req.body || {};
    if (!idmarcacaomesa || !idreservasfront) {
      return res.status(400).json({
        error:
          'ParÃ¢metros invÃ¡lidos. Envie idmarcacaomesa e idreservasfront.'
      });
    }

    const db = getOracle();
    const sql = `
      UPDATE CM.ENOMARCACAOITEMANO
         SET IDRESERVASFRONT = NULL,
             STATUS = 0,
             DESCRICAO = NULL
       WHERE IDMARCACAOMESA = ?
         AND IDRESERVASFRONT = ?
    `;
    const resp = await db.query(sql, [idmarcacaomesa, idreservasfront]);
    const afetados = resp.rowCount || 0;

    if (!afetados) {
      return res
        .status(404)
        .json({ error: 'Nenhum item encontrado para cancelar.' });
    }

    return res.json({ ok: true, afetados });
  } catch (err) {
    console.error('Erro ao cancelar marcaÃ§Ã£o:', err);
    res.status(500).json({ error: 'Falha ao cancelar marcaÃ§Ã£o.' });
  }
});

module.exports = router;

