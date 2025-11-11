const express = require('express');
const { getDatabase } = require('../config/database');
const { ApiError } = require('../middleware/errorHandler');

const router = express.Router();

function isValidString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function isValidInt(value) {
  return Number.isInteger(Number(value));
}

function isValidDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getOverlaps(db, coduh, checkin, checkout, excludeId, callback) {
  let sql =
    'SELECT id, idreservacm, numeroreservacm, coduh, nome_hospede, contato, email, data_checkin, data_checkout, qtd_hospedes FROM reservas WHERE coduh = ? AND NOT (data_checkout <= ? OR data_checkin >= ?)';
  const params = [coduh, checkin, checkout];
  if (excludeId !== undefined) {
    sql += ' AND id <> ?';
    params.push(excludeId);
  }
  db.all(sql, params, callback);
}

// List all reservations with pagination or fetch by codigoUH/hoje
router.get('/', (req, res, next) => {
  const db = getDatabase();
  const { codigoUH, hoje } = req.query;

  // When codigoUH and hoje are provided, search for a valid reservation
  if (codigoUH && hoje) {
    if (!isValidString(codigoUH) || !isValidDate(hoje)) {
      return next(new ApiError(400, 'Parâmetros inválidos', 'INVALID_SEARCH_PARAMS'));
    }

    db.all(
      `SELECT id, idreservacm, numeroreservacm, coduh, nome_hospede, contato, email, data_checkin, data_checkout, qtd_hospedes
         FROM reservas
        WHERE coduh = ?
          AND data_checkin <= ?
          AND data_checkout >= ?`,
      [codigoUH, hoje, hoje],
      (err, rows) => {
        if (err) {
          console.error('❌ Erro ao buscar reserva:', err.message);
          return next(new ApiError(500, 'Erro ao buscar reserva', 'SEARCH_RESERVATION_ERROR', err.message));
        }
        if (rows.length === 0) {
          return next(new ApiError(404, 'Reserva não encontrada', 'RESERVATION_NOT_FOUND'));
        }
        if (rows.length > 1) {
          return next(new ApiError(409, 'Múltiplas reservas válidas para este código UH', 'MULTIPLE_RESERVATIONS'));
        }
        res.json(rows[0]);
      }
    );
    return;
  }

  // Default listing with pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (page - 1) * limit;

  db.all(
    'SELECT id, idreservacm, numeroreservacm, coduh, nome_hospede, contato, email, data_checkin, data_checkout, qtd_hospedes FROM reservas LIMIT ? OFFSET ?',
    [limit, offset],
    (err, rows) => {
      if (err) {
        console.error('❌ Erro ao listar reservas:', err.message);
        return next(new ApiError(500, 'Erro ao listar reservas', 'LIST_RESERVATIONS_ERROR', err.message));
      }
      db.get('SELECT COUNT(*) as count FROM reservas', [], (err2, result) => {
        if (err2) {
          console.error('❌ Erro ao contar reservas:', err2.message);
          return next(new ApiError(500, 'Erro ao listar reservas', 'LIST_RESERVATIONS_ERROR', err2.message));
        }
        res.json({ data: rows, total: result.count });
      });
    }
  );
});

// Search reservation by coduh and period
router.get('/buscar', (req, res, next) => {
  const { coduh, checkin, checkout } = req.query;
  if (!isValidString(coduh) || !isValidDate(checkin) || !isValidDate(checkout)) {
    return next(new ApiError(400, 'Parâmetros inválidos', 'INVALID_SEARCH_PARAMS'));
  }
  const db = getDatabase();
  getOverlaps(db, coduh, checkin, checkout, undefined, (err, rows) => {
    if (err) {
      console.error('❌ Erro ao buscar reserva:', err.message);
      return next(new ApiError(500, 'Erro ao buscar reserva', 'SEARCH_RESERVATION_ERROR', err.message));
    }
    if (rows.length > 1) {
      return next(new ApiError(409, 'Múltiplas reservas sobrepostas encontradas', 'MULTIPLE_RESERVATIONS'));
    }
    if (rows.length === 0) {
      return next(new ApiError(404, 'Reserva não encontrada', 'RESERVATION_NOT_FOUND'));
    }
    res.json(rows[0]);
  });
});

// Validate reservation by coduh and current date
router.get('/validate-coduh/:coduh', async (req, res, next) => {
  const { coduh } = req.params;
  if (!isValidString(coduh)) {
    return next(new ApiError(400, 'coduh inválido', 'INVALID_CODUH'));
  }
  try {
    const db = getDatabase();
    const { rows: [reserva] } = await db.query(
      `SELECT id, nome_hospede, contato, email, data_checkin, data_checkout, qtd_hospedes
         FROM reservas
        WHERE coduh = ?
          AND data_checkin <= CURRENT_DATE
          AND data_checkout >= CURRENT_DATE`,
      [coduh]
    );
    if (!reserva) {
      return next(new ApiError(404, 'Reserva não encontrada', 'RESERVATION_NOT_FOUND'));
    }
    const { rows: eventos } = await db.query(
      `SELECT er.evento_id, e.nome_evento, er.status
         FROM eventos_reservas er
         JOIN eventos e ON er.evento_id = e.id
        WHERE er.reserva_id = ?`,
      [reserva.id]
    );
    res.json({ ...reserva, eventos });
  } catch (err) {
    console.error('❌ Erro ao validar coduh:', err.message);
    next(new ApiError(500, 'Erro ao validar coduh', 'VALIDATE_CODUH_ERROR', err.message));
  }
});

// Get marks for a reservation
router.get('/:id/marcacoes', async (req, res, next) => {
  const { id } = req.params;
  if (!isValidInt(id)) {
    return next(new ApiError(400, 'ID inválido', 'INVALID_ID'));
  }
  try {
    const db = getDatabase();
    const { rows } = await db.query(
      `SELECT er.evento_id, er.reserva_id, er.quantidade, er.informacoes, er.status, er.voucher,
              e.nome_evento AS evento_nome, e.data_evento
         FROM eventos_reservas er
         JOIN eventos e ON er.evento_id = e.id
        WHERE er.reserva_id = ?`,
      [id]
    );
    res.json(rows);
  } catch (error) {
    console.error('❌ Erro ao obter marcações da reserva:', error.message);
    next(new ApiError(500, 'Erro ao obter marcações', 'GET_MARCACOES_RESERVA_ERROR', error.message));
  }
});

// Get single reservation
router.get('/:id', (req, res, next) => {
  if (!isValidInt(req.params.id)) {
    return next(new ApiError(400, 'ID inválido', 'INVALID_ID'));
  }
  const db = getDatabase();
  db.get('SELECT id, idreservacm, numeroreservacm, coduh, nome_hospede, contato, email, data_checkin, data_checkout, qtd_hospedes FROM reservas WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      console.error('❌ Erro ao obter reserva:', err.message);
      return next(new ApiError(500, 'Erro ao obter reserva', 'GET_RESERVATION_ERROR', err.message));
    }
    if (!row) {
      return next(new ApiError(404, 'Reserva não encontrada', 'RESERVATION_NOT_FOUND'));
    }
    res.json(row);
  });
});

// Create reservation
router.post('/', (req, res, next) => {
  const { idreservacm, numeroreservacm, coduh, nome_hospede, contato, email, data_checkin, data_checkout, qtd_hospedes } = req.body;
  if (
    !isValidInt(idreservacm) ||
    !isValidString(numeroreservacm) ||
    !isValidString(coduh) ||
    !isValidString(nome_hospede) ||
    !isValidString(contato) ||
    !isValidEmail(email) ||
    !isValidDate(data_checkin) ||
    !isValidDate(data_checkout) ||
    !isValidInt(qtd_hospedes)
  ) {
    return next(new ApiError(400, 'Dados inválidos para criação de reserva', 'INVALID_FIELDS'));
  }
  const db = getDatabase();
  getOverlaps(db, coduh, data_checkin, data_checkout, undefined, (err, rows) => {
    if (err) {
      console.error('❌ Erro ao verificar conflitos:', err.message);
      return next(new ApiError(500, 'Erro ao verificar conflitos', 'OVERLAP_CHECK_ERROR', err.message));
    }
    if (rows.length > 0) {
      return next(new ApiError(409, 'Período já reservado para este coduh', 'RESERVATION_CONFLICT'));
    }
    db.run(
      'INSERT INTO reservas (idreservacm, numeroreservacm, coduh, nome_hospede, contato, email, data_checkin, data_checkout, qtd_hospedes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id',
      [idreservacm, numeroreservacm, coduh, nome_hospede, contato, email, data_checkin, data_checkout, qtd_hospedes],
      function(err2) {
        if (err2) {
          console.error('❌ Erro ao criar reserva:', err2.message);
          return next(new ApiError(500, 'Erro ao criar reserva', 'CREATE_RESERVATION_ERROR', err2.message));
        }
        res.status(201).json({ id: this.lastID, idreservacm, numeroreservacm, coduh, nome_hospede, contato, email, data_checkin, data_checkout, qtd_hospedes });
      }
    );
  });
});

// Update reservation
router.put('/:id', (req, res, next) => {
  if (!isValidInt(req.params.id)) {
    return next(new ApiError(400, 'ID inválido', 'INVALID_ID'));
  }
  const db = getDatabase();
  db.get('SELECT coduh, data_checkin, data_checkout FROM reservas WHERE id = ?', [req.params.id], (err, existing) => {
    if (err) {
      console.error('❌ Erro ao obter reserva:', err.message);
      return next(new ApiError(500, 'Erro ao obter reserva', 'GET_RESERVATION_ERROR', err.message));
    }
    if (!existing) {
      return next(new ApiError(404, 'Reserva não encontrada', 'RESERVATION_NOT_FOUND'));
    }

    const { idreservacm, numeroreservacm, coduh, nome_hospede, contato, email, data_checkin, data_checkout, qtd_hospedes } = req.body;
    const fields = [];
    const values = [];

    let finalCoduh = existing.coduh;
    let finalCheckin = existing.data_checkin;
    let finalCheckout = existing.data_checkout;

    if (idreservacm !== undefined) {
      if (!isValidInt(idreservacm)) return next(new ApiError(400, 'idreservacm deve ser inteiro', 'INVALID_IDRESERVACM'));
      fields.push('idreservacm = ?'); values.push(idreservacm);
    }
    if (numeroreservacm !== undefined) {
      if (!isValidString(numeroreservacm)) return next(new ApiError(400, 'numeroreservacm inválido', 'INVALID_NUMERORESERVACM'));
      fields.push('numeroreservacm = ?'); values.push(numeroreservacm);
    }
    if (coduh !== undefined) {
      if (!isValidString(coduh)) return next(new ApiError(400, 'coduh inválido', 'INVALID_CODUH'));
      fields.push('coduh = ?'); values.push(coduh); finalCoduh = coduh;
    }
    if (nome_hospede !== undefined) {
      if (!isValidString(nome_hospede)) return next(new ApiError(400, 'nome_hospede inválido', 'INVALID_NOME_HOSPEDE'));
      fields.push('nome_hospede = ?'); values.push(nome_hospede);
    }
    if (contato !== undefined) {
      if (!isValidString(contato)) return next(new ApiError(400, 'contato inválido', 'INVALID_CONTATO'));
      fields.push('contato = ?'); values.push(contato);
    }
    if (email !== undefined) {
      if (!isValidEmail(email)) return next(new ApiError(400, 'email inválido', 'INVALID_EMAIL'));
      fields.push('email = ?'); values.push(email);
    }
    if (data_checkin !== undefined) {
      if (!isValidDate(data_checkin)) return next(new ApiError(400, 'data_checkin inválida', 'INVALID_DATA_CHECKIN'));
      fields.push('data_checkin = ?'); values.push(data_checkin); finalCheckin = data_checkin;
    }
    if (data_checkout !== undefined) {
      if (!isValidDate(data_checkout)) return next(new ApiError(400, 'data_checkout inválida', 'INVALID_DATA_CHECKOUT'));
      fields.push('data_checkout = ?'); values.push(data_checkout); finalCheckout = data_checkout;
    }
    if (qtd_hospedes !== undefined) {
      if (!isValidInt(qtd_hospedes)) return next(new ApiError(400, 'qtd_hospedes deve ser inteiro', 'INVALID_QTD_HOSPEDES'));
      fields.push('qtd_hospedes = ?'); values.push(qtd_hospedes);
    }
    if (fields.length === 0) {
      return next(new ApiError(400, 'Nenhum dado para atualizar', 'NO_FIELDS_TO_UPDATE'));
    }

    getOverlaps(db, finalCoduh, finalCheckin, finalCheckout, req.params.id, (err2, rows) => {
      if (err2) {
        console.error('❌ Erro ao verificar conflitos:', err2.message);
        return next(new ApiError(500, 'Erro ao verificar conflitos', 'OVERLAP_CHECK_ERROR', err2.message));
      }
      if (rows.length > 0) {
        return next(new ApiError(409, 'Período já reservado para este coduh', 'RESERVATION_CONFLICT'));
      }

      values.push(req.params.id);
      const sql = `UPDATE reservas SET ${fields.join(', ')} WHERE id = ?`;
      db.run(sql, values, function(err3) {
        if (err3) {
          console.error('❌ Erro ao atualizar reserva:', err3.message);
          return next(new ApiError(500, 'Erro ao atualizar reserva', 'UPDATE_RESERVATION_ERROR', err3.message));
        }
        if (this.changes === 0) {
          return next(new ApiError(404, 'Reserva não encontrada', 'RESERVATION_NOT_FOUND'));
        }
        res.json({ message: 'Reserva atualizada com sucesso' });
      });
    });
  });
});

// Delete reservation
router.delete('/:id', (req, res, next) => {
  if (!isValidInt(req.params.id)) {
    return next(new ApiError(400, 'ID inválido', 'INVALID_ID'));
  }
  const db = getDatabase();
  db.run('DELETE FROM reservas WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      console.error('❌ Erro ao deletar reserva:', err.message);
      return next(new ApiError(500, 'Erro ao deletar reserva', 'DELETE_RESERVATION_ERROR', err.message));
    }
    if (this.changes === 0) {
      return next(new ApiError(404, 'Reserva não encontrada', 'RESERVATION_NOT_FOUND'));
    }
    res.json({ message: 'Reserva deletada com sucesso' });
  });
});

module.exports = router;
