const express = require('express');
const { getDatabase } = require('../config/database');
const { ApiError } = require('../middleware/errorHandler');
const eventoReservaModel = require('../models/eventoReservaModel');

async function getActiveRules() {
  const db = getDatabase();
  const { rows } = await db.query('SELECT chave FROM regras_validacao WHERE ativo = 1');
  return new Set(rows.map(r => r.chave));
}

const router = express.Router();

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidTime(value) {
  return /^\d{2}:\d{2}$/.test(value);
}

function isValidInt(value) {
  return Number.isInteger(Number(value));
}

function buildPdf(lines) {
  const header = '%PDF-1.1\n';
  const objs = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n'
  ];
  const content =
    'BT\n/F1 14 Tf\n72 720 Td\n' +
    lines
      .map((line, idx) => {
        const text = line.replace(/[\\()]/g, m => '\\' + m);
        return (idx ? '0 -20 Td\n' : '') + `(${text}) Tj\n`;
      })
      .join('') +
    'ET';
  objs.push(
    `4 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`
  );
  objs.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');
  let xref = 'xref\n0 6\n0000000000 65535 f \n';
  let offset = header.length;
  for (const o of objs) {
    xref += String(offset).padStart(10, '0') + ' 00000 n \n';
    offset += o.length;
  }
  const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF`;
  return Buffer.from(header + objs.join('') + xref + trailer);
}

// List all events with pagination or by specific date
router.get('/', (req, res, next) => {
  const db = getDatabase();
  const { data } = req.query;

  // When a date is provided, return only events for that day
  if (data) {
    if (!isValidDate(data)) {
      return next(new ApiError(400, 'Data inválida', 'INVALID_DATE'));
    }
    db.all(
      `SELECT e.id, e.nome_evento AS nome, e.data_evento AS data, e.horario_evento AS hora, e.id_restaurante AS restaurante_id, r.nome AS restaurante
         FROM eventos e
         JOIN restaurantes r ON e.id_restaurante = r.id
        WHERE e.data_evento = ?`,
      [data],
      (err, rows) => {
        if (err) {
          console.error('❌ Erro ao listar eventos:', err.message);
          return next(new ApiError(500, 'Erro ao listar eventos', 'LIST_EVENTS_ERROR', err.message));
        }
        res.json(rows);
      }
    );
    return;
  }

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (page - 1) * limit;

  db.all(
    'SELECT e.id, e.nome_evento AS nome, e.data_evento AS data, e.horario_evento AS hora, e.id_restaurante AS restaurante_id, r.nome AS restaurante FROM eventos e JOIN restaurantes r ON e.id_restaurante = r.id LIMIT ? OFFSET ?',
    [limit, offset],
    (err, rows) => {
      if (err) {
        console.error('❌ Erro ao listar eventos:', err.message);
        return next(new ApiError(500, 'Erro ao listar eventos', 'LIST_EVENTS_ERROR', err.message));
      }
      db.get('SELECT COUNT(*) as count FROM eventos', [], (err2, result) => {
        if (err2) {
          console.error('❌ Erro ao contar eventos:', err2.message);
          return next(new ApiError(500, 'Erro ao listar eventos', 'LIST_EVENTS_ERROR', err2.message));
        }
        res.json({ data: rows, total: result.count });
      });
    }
    );
  });

// List available events by date
router.get('/disponiveis', async (req, res, next) => {
  const { data } = req.query;
  if (!data || !isValidDate(data)) {
    return next(new ApiError(400, 'Data inválida', 'INVALID_DATE'));
  }
  try {
    const db = getDatabase();
    const rules = await getActiveRules();
    const { rows } = await db.query(
      `SELECT e.id,
              e.nome_evento,
              e.horario_evento AS hora,
              r.nome AS restaurante,
              r.capacidade,
              COALESCE(SUM(er.quantidade),0) AS ocupacao
         FROM eventos e
         JOIN restaurantes r ON e.id_restaurante = r.id
    LEFT JOIN eventos_reservas er ON er.evento_id = e.id AND er.status <> 'Cancelada'
        WHERE e.data_evento = ?
        GROUP BY e.id, e.nome_evento, e.horario_evento, r.nome, r.capacidade
       HAVING (r.capacidade - COALESCE(SUM(er.quantidade),0)) > 0`,
      [data]
    );
    const result = rows.map(row => {
      const vagas = Number(row.capacidade) - Number(row.ocupacao);
      return {
        disponibilidade: vagas > 0,
        restaurante: row.restaurante,
        vagas,
        id: row.id,
        nome: row.nome_evento,
        hora: row.hora
      };
    });
    res.json(result);
  } catch (error) {
    console.error('❌ Erro ao listar eventos disponíveis:', error.message);
    next(new ApiError(500, 'Erro ao listar eventos disponíveis', 'LIST_AVAILABLE_EVENTS_ERROR', error.message));
  }
});

// Get single event
router.get('/:id', (req, res, next) => {
  if (!isValidInt(req.params.id)) {
    return next(new ApiError(400, 'ID inválido', 'INVALID_ID'));
  }
  const db = getDatabase();
  db.get('SELECT e.id, e.nome_evento AS nome, e.data_evento AS data, e.horario_evento AS hora, e.id_restaurante AS restaurante_id, r.nome AS restaurante FROM eventos e JOIN restaurantes r ON e.id_restaurante = r.id WHERE e.id = ?', [req.params.id], (err, row) => {
    if (err) {
      console.error('❌ Erro ao obter evento:', err.message);
      return next(new ApiError(500, 'Erro ao obter evento', 'GET_EVENT_ERROR', err.message));
    }
    if (!row) {
      return next(new ApiError(404, 'Evento não encontrado', 'EVENT_NOT_FOUND'));
    }
    res.json(row);
  });
});

// Get event availability
router.get('/:id/disponibilidade', async (req, res, next) => {
  const { id } = req.params;

  if (!isValidInt(id)) {
    return next(new ApiError(400, 'ID inválido', 'INVALID_ID'));
  }

  try {
    const db = getDatabase();

    const { rows: [evento] } = await db.query(
      `SELECT e.data_evento, r.capacidade
         FROM eventos e
         JOIN restaurantes r ON e.id_restaurante = r.id
        WHERE e.id = ?`,
      [id]
    );

    if (!evento) {
      return next(new ApiError(404, 'Evento não encontrado', 'EVENT_NOT_FOUND'));
    }

    const { rows: [sum] } = await db.query(
      `SELECT COALESCE(SUM(quantidade),0) AS ocupacao
         FROM eventos_reservas
        WHERE evento_id = ?`,
      [id]
    );

    const capacidade = Number(evento.capacidade) || 0;
    const ocupacao = Number(sum.ocupacao) || 0;
    const vagas = capacidade - ocupacao;

    res.json({
      capacidade_total: capacidade,
      ocupacao,
      vagas_restantes: vagas
    });
  } catch (error) {
    console.error('❌ Erro ao obter disponibilidade do evento:', error.message);
    next(new ApiError(500, 'Erro ao obter disponibilidade', 'GET_AVAILABILITY_ERROR', error.message));
  }
});

// List markings for an event or check if a reservation already has one on the same day
router.get('/:id/marcacoes', async (req, res, next) => {
  const { id } = req.params;
  const { reservaId } = req.query;

  if (!isValidInt(id)) {
    return next(new ApiError(400, 'ID inválido', 'INVALID_ID'));
  }

  const db = getDatabase();
  try {
    if (reservaId) {
      if (!isValidInt(reservaId)) {
        return next(new ApiError(400, 'reservaId inválido', 'INVALID_RESERVA_ID'));
      }
      const { rows } = await db.query(
        `SELECT er.reserva_id, er.quantidade, er.informacoes, er.status
           FROM eventos_reservas er
          WHERE er.evento_id = ? AND er.reserva_id = ?`,
        [id, reservaId]
      );
      return res.json(rows);
    }

    const { rows } = await db.query(
      `SELECT er.reserva_id, er.quantidade, er.informacoes, er.status
         FROM eventos_reservas er
        WHERE er.evento_id = ?`,
      [id]
    );
    res.json(rows);
  } catch (error) {
    console.error('❌ Erro ao obter marcações do evento:', error.message);
    next(new ApiError(500, 'Erro ao obter marcações', 'GET_MARCACOES_ERROR', error.message));
  }
});

router.get('/:eventoId/marcacoes/:reservaId/voucher', async (req, res, next) => {
  const { eventoId, reservaId } = req.params;
  if (!isValidInt(eventoId) || !isValidInt(reservaId)) {
    return next(new ApiError(400, 'ID inválido', 'INVALID_ID'));
  }
  try {
    const db = getDatabase();
    const { rows: [dados] } = await db.query(
      `SELECT r.numeroreservacm, r.nome_hospede, e.nome_evento, e.data_evento,
              e.horario_evento, rest.nome AS restaurante, er.status, er.quantidade, er.voucher
         FROM eventos_reservas er
         JOIN reservas r ON er.reserva_id = r.id
         JOIN eventos e ON er.evento_id = e.id
         JOIN restaurantes rest ON e.id_restaurante = rest.id
        WHERE er.evento_id = ? AND er.reserva_id = ?`,
      [eventoId, reservaId]
    );
    if (!dados) {
      return next(new ApiError(404, 'Marcação não encontrada', 'MARCACAO_NOT_FOUND'));
    }
    const lines = [
      `Voucher: ${dados.voucher}`,
      '',
      `Reserva: ${dados.numeroreservacm} - ${dados.nome_hospede}`,
      `Evento: ${dados.nome_evento}`,
      `Data: ${dados.data_evento} ${dados.horario_evento}`,
      `Restaurante: ${dados.restaurante}`,
      `Quantidade: ${dados.quantidade}`,
      `Status: ${dados.status}`
    ];
    const pdfBuffer = buildPdf(lines);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="voucher.pdf"');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('❌ Erro ao gerar voucher:', error.message);
    next(new ApiError(500, 'Erro ao gerar voucher', 'VOUCHER_ERROR', error.message));
  }
});

// Create a new mark for an event
router.post('/:id/marcar', async (req, res, next) => {
  const { id } = req.params;
  const { reservaId, quantidade, informacoes } = req.body;

  if (!isValidInt(id)) {
    return next(new ApiError(400, 'ID inválido', 'INVALID_ID'));
  }
  if (!isValidInt(reservaId) || !isValidInt(quantidade)) {
    return next(new ApiError(400, 'Dados inválidos', 'INVALID_FIELDS'));
  }

  try {
    const db = getDatabase();

    const { rows: [evento] } = await db.query(
      `SELECT e.data_evento, e.id_restaurante, r.capacidade
         FROM eventos e
         JOIN restaurantes r ON e.id_restaurante = r.id
        WHERE e.id = ?`,
      [id]
    );
    if (!evento) {
      return next(new ApiError(404, 'Evento não encontrado', 'EVENT_NOT_FOUND'));
    }

    const { rows: [reserva] } = await db.query(
      'SELECT id, nome_hospede, data_checkin, data_checkout, qtd_hospedes FROM reservas WHERE id = ?',
      [reservaId]
    );
    if (!reserva) {
      return next(new ApiError(404, 'Reserva não encontrada', 'RESERVA_NOT_FOUND'));
    }

    // Rule 1: quantidade não pode ultrapassar número de hóspedes da reserva
    if (rules.has('QUANTIDADE_RESERVA') && quantidade > reserva.qtd_hospedes) {
      return next(new ApiError(400, 'Quantidade excede número de hóspedes da reserva', 'QUANTIDADE_EXCEDE_RESERVA'));
    }

    // Rule 2: total de hóspedes no evento não pode ultrapassar capacidade
    if (rules.has('CAPACIDADE_EVENTO')) {
      const { rows: [ocup] } = await db.query(
        `SELECT COALESCE(SUM(quantidade),0) AS total
           FROM eventos_reservas
          WHERE evento_id = ?
            AND status <> 'Cancelada'`,
        [id]
      );
      const vagas = evento.capacidade - Number(ocup.total);
      if (quantidade > vagas) {
        return next(new ApiError(400, 'Capacidade do evento excedida', 'CAPACIDADE_EXCEDIDA'));
      }
    }

    // Rule 3: não pode existir mais de uma marcação ativa para o mesmo evento e reserva
    if (rules.has('MARCACAO_DUPLICADA_EVENTO_RESERVA')) {
      const { rows: duplicated } = await db.query(
        `SELECT 1
           FROM eventos_reservas er
          WHERE er.evento_id = ?
            AND er.reserva_id = ?
            AND er.status = 'Ativa'`,
        [id, reservaId]
      );
      if (duplicated.length > 0) {
        return next(new ApiError(400, 'Marcação ativa já existe para este evento', 'MARCACAO_DUPLICADA'));
      }
    }

    // Rule 4: hóspede só pode ter uma marcação ativa para o mesmo evento
    if (rules.has('HOSPEDE_DUPLICADO_EVENTO')) {
      const { rows: guestConflict } = await db.query(
        `SELECT 1
           FROM eventos_reservas er
           JOIN reservas r ON er.reserva_id = r.id
          WHERE er.evento_id = ?
            AND r.nome_hospede = ?
            AND er.status = 'Ativa'`,
        [id, reserva.nome_hospede]
      );
      if (guestConflict.length > 0) {
        return next(new ApiError(400, 'Hóspede já possui marcação ativa para este evento', 'HOSPEDE_DUPLICADO'));
      }
    }

    // Rule 5: mesma reserva não pode ser vinculada a mais de um evento no mesmo dia
    if (rules.has('RESERVA_DUPLICADA_DIA')) {
      const { rows: conflitos } = await db.query(
        `SELECT 1
           FROM eventos_reservas er
           JOIN eventos e ON er.evento_id = e.id
          WHERE er.reserva_id = ?
            AND e.data_evento = ?
            AND er.status <> 'Cancelada'`,
        [reservaId, evento.data_evento]
      );
      if (conflitos.length > 0) {
        return next(new ApiError(400, 'Reserva já vinculada a outro evento neste dia', 'RESERVA_DUPLICADA'));
      }
    }

    // Rule 6: limite de marcações conforme duração da reserva
    if (rules.has('LIMITE_MARCACOES_ESTADIA')) {
      const checkin = new Date(reserva.data_checkin);
      const checkout = new Date(reserva.data_checkout);
      const diff = Math.max(1, Math.ceil((checkout - checkin) / (1000 * 60 * 60 * 24)));
      let limite = 1;
      if (diff >= 7) {
        limite = 3;
      } else if (diff >= 3) {
        limite = 2;
      }
      const { rows: [countRes] } = await db.query(
        `SELECT CAST(COUNT(*) AS NUMBER) AS count
           FROM eventos_reservas
          WHERE reserva_id = ?
            AND status <> 'Cancelada'`,
        [reservaId]
      );
      if (countRes.count >= limite) {
        return next(new ApiError(400, 'Limite de marcações atingido para a reserva', 'LIMITE_MARCACOES'));
      }
    }

    const created = await eventoReservaModel.create({
      eventoId: id,
      reservaId,
      informacoes,
      quantidade,
      status: 'Ativa'
    });

    res.status(201).json(created);
  } catch (error) {
    console.error('❌ Erro ao salvar marcação:', error.message);
    next(new ApiError(500, 'Erro ao salvar marcação', 'SAVE_MARCACAO_ERROR', error.message));
  }
});

router.patch('/:eventoId/marcacoes/:reservaId/status', async (req, res, next) => {
  const { eventoId, reservaId } = req.params;
  const { status } = req.body;

  if (!isValidInt(eventoId) || !isValidInt(reservaId)) {
    return next(new ApiError(400, 'ID inválido', 'INVALID_ID'));
  }

  const allowed = ['Ativa', 'Finalizada', 'Cancelada', 'Não Compareceu'];
  if (!allowed.includes(status)) {
    return next(new ApiError(400, 'Status inválido', 'INVALID_STATUS'));
  }

  try {
    const db = getDatabase();
    const result = await db.query(
      'UPDATE eventos_reservas SET status = ? WHERE evento_id = ? AND reserva_id = ?',
      [status, eventoId, reservaId]
    );

    if (result.rowCount === 0) {
      return next(new ApiError(404, 'Marcação não encontrada', 'MARCACAO_NOT_FOUND'));
    }

    res.json({ message: 'Status atualizado com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao atualizar status da marcação:', error.message);
    next(new ApiError(500, 'Erro ao atualizar status da marcação', 'UPDATE_STATUS_ERROR', error.message));
  }
});

// Create events in bulk within a date range
router.post('/em-massa', async (req, res, next) => {
  const { nome, hora, restauranteId, dataInicio, dataFim } = req.body;
  if (
    !nome ||
    !isValidTime(hora) ||
    !isValidDate(dataInicio) ||
    !isValidDate(dataFim) ||
    !isValidInt(restauranteId)
  ) {
    return next(new ApiError(400, 'Dados inválidos para criação em massa', 'INVALID_FIELDS'));
  }

  const start = new Date(dataInicio);
  const end = new Date(dataFim);
  if (end < start) {
    return next(new ApiError(400, 'Data final anterior à inicial', 'INVALID_DATE_RANGE'));
  }

  try {
    const db = getDatabase();
    const created = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const { rows } = await db.query(
        'SELECT id FROM eventos WHERE data_evento = ? AND horario_evento = ? AND id_restaurante = ?',
        [dateStr, hora, restauranteId]
      );
      if (rows.length === 0) {
        const result = await db.query(
          'INSERT INTO eventos (nome_evento, data_evento, horario_evento, id_restaurante) VALUES (?, ?, ?, ?) RETURNING id',
          [nome, dateStr, hora, restauranteId]
        );
        created.push({ id: result.rows[0].id, nome, data: dateStr, hora, restauranteId });
      }
    }
    res.status(201).json({ criados: created.length, eventos: created });
  } catch (error) {
    console.error('❌ Erro ao criar eventos em massa:', error.message);
    next(new ApiError(500, 'Erro ao criar eventos em massa', 'CREATE_BULK_EVENTS_ERROR', error.message));
  }
});

// Create event
router.post('/', (req, res, next) => {
  const { nome, data, hora, restauranteId } = req.body;
  if (!nome || !isValidDate(data) || !isValidTime(hora) || !isValidInt(restauranteId)) {
    return next(new ApiError(400, 'Dados inválidos para criação de evento', 'INVALID_FIELDS'));
  }
  const db = getDatabase();
  db.get(
    'SELECT id FROM eventos WHERE data_evento = ? AND horario_evento = ? AND id_restaurante = ?',
    [data, hora, restauranteId],
    (err, existing) => {
      if (err) {
        console.error('❌ Erro ao verificar evento:', err.message);
        return next(new ApiError(500, 'Erro ao verificar evento', 'CHECK_EVENT_ERROR', err.message));
      }
      if (existing) {
        return next(new ApiError(400, 'Já existe um evento para este restaurante neste dia e horário', 'EVENTO_DUPLICADO'));
      }
      db.run(
        'INSERT INTO eventos (nome_evento, data_evento, horario_evento, id_restaurante) VALUES (?, ?, ?, ?) RETURNING id',
        [nome, data, hora, restauranteId],
        function(err) {
          if (err) {
            console.error('❌ Erro ao criar evento:', err.message);
            return next(new ApiError(500, 'Erro ao criar evento', 'CREATE_EVENT_ERROR', err.message));
          }
          res.status(201).json({ id: this.lastID, nome, data, hora, restauranteId });
        }
      );
    }
  );
});

// Update event
router.put('/:id', (req, res, next) => {
  if (!isValidInt(req.params.id)) {
    return next(new ApiError(400, 'ID inválido', 'INVALID_ID'));
  }
  const { nome, data, hora, restauranteId } = req.body;
  const fields = [];
  const values = [];
  if (nome) { fields.push('nome_evento = ?'); values.push(nome); }
  if (data) {
    if (!isValidDate(data)) return next(new ApiError(400, 'Data inválida', 'INVALID_DATE'));
    fields.push('data_evento = ?'); values.push(data);
  }
  if (hora) {
    if (!isValidTime(hora)) return next(new ApiError(400, 'Horário inválido', 'INVALID_TIME'));
    fields.push('horario_evento = ?'); values.push(hora);
  }
  if (restauranteId !== undefined) {
    if (!isValidInt(restauranteId)) return next(new ApiError(400, 'RestauranteId deve ser inteiro', 'INVALID_RESTAURANT_ID'));
    fields.push('id_restaurante = ?'); values.push(restauranteId);
  }
  if (fields.length === 0) {
    return next(new ApiError(400, 'Nenhum dado para atualizar', 'NO_FIELDS_TO_UPDATE'));
  }
  values.push(req.params.id);
  const sql = `UPDATE eventos SET ${fields.join(', ')} WHERE id = ?`;
  const db = getDatabase();
  db.run(sql, values, function(err) {
    if (err) {
      console.error('❌ Erro ao atualizar evento:', err.message);
      return next(new ApiError(500, 'Erro ao atualizar evento', 'UPDATE_EVENT_ERROR', err.message));
    }
    if (this.changes === 0) {
      return next(new ApiError(404, 'Evento não encontrado', 'EVENT_NOT_FOUND'));
    }
    res.json({ message: 'Evento atualizado com sucesso' });
  });
});

// Delete event
router.delete('/:id', (req, res, next) => {
  if (!isValidInt(req.params.id)) {
    return next(new ApiError(400, 'ID inválido', 'INVALID_ID'));
  }
  const db = getDatabase();
  db.get(
    'SELECT 1 FROM eventos_reservas WHERE evento_id = ? AND status <> ? LIMIT 1',
    [req.params.id, 'Cancelada'],
    (err, row) => {
      if (err) {
        console.error('❌ Erro ao verificar reservas do evento:', err.message);
        return next(
          new ApiError(
            500,
            'Erro ao verificar reservas do evento',
            'CHECK_EVENT_RESERVAS_ERROR',
            err.message
          )
        );
      }
      if (row) {
        return next(
          new ApiError(
            400,
            'Evento possui reservas ativas e não pode ser excluído',
            'EVENT_HAS_ACTIVE_RESERVAS'
          )
        );
      }
      db.run('DELETE FROM eventos WHERE id = ?', [req.params.id], function(err2) {
        if (err2) {
          console.error('❌ Erro ao deletar evento:', err2.message);
          return next(
            new ApiError(500, 'Erro ao deletar evento', 'DELETE_EVENT_ERROR', err2.message)
          );
        }
        if (this.changes === 0) {
          return next(new ApiError(404, 'Evento não encontrado', 'EVENT_NOT_FOUND'));
        }
        res.json({ message: 'Evento deletado com sucesso' });
      });
    }
  );
});
  

module.exports = router;
