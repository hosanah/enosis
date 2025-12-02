const express = require('express');
const router = express.Router();
const { getOracle } = require('../config/oracle');

// GET /natal/reservas
// Query params: checkin (YYYY-MM-DD), checkout (YYYY-MM-DD), nome, coduh, page, size
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
      conditions.push("UPPER(H.NOME || ' ' || H.SOBRENOME) LIKE ?");
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
    }));

    res.json({ data, total, page, size });
  } catch (err) {
    console.error('Erro ao buscar reservas no Oracle:', err);
    res.status(500).json({ error: 'Falha ao consultar reservas.' });
  }
});
\n// Mesas: listar ocupação atual\nrouter.get('/mesas', async (req, res) => {\n  try {\n    const sql = \n      SELECT EM.NUMMESA, EM.ORDEM,\n             (SELECT COUNT(EI.IDMARCACAOITEM)\n                FROM CM.ENOMARCACAOITEM EI\n               WHERE EM.IDMARCACAOMESA = EI.IDMARCACAOMESA\n                 AND EI.STATUS = 1) OCUPADOS,\n             EM.QUANTIDADE QUANTIDADETOTAL\n        FROM CM.ENOMARCACAO MESA EM;\n    const db = getOracle();\n    const { rows } = await db.query(sql, []);\n    const data = (rows || []).map(r => ({\n      nummesa: r.NUMMESA ?? r.nummesa,\n      ordem: r.ORDEM ?? r.ordem,\n      ocupados: r.OCUPADOS ?? r.ocupados,\n      quantidadetotal: r.QUANTIDADETOTAL ?? r.quantidadetotal\n    }));\n    res.json({ data });\n  } catch (err) {\n    console.error('Erro ao buscar mesas no Oracle:', err);\n    res.status(500).json({ error: 'Falha ao consultar mesas.' });\n  }\n});\n\nmodule.exports = router;
  } catch (err) {
    console.error('Erro ao buscar mesas no Oracle:', err);
    res.status(500).json({ error: 'Falha ao consultar mesas.' });
  }
});

