const { getDatabase } = require('../config/database');

async function findAll() {
  const db = getDatabase();
  const { rows } = await db.query(
    'SELECT evento_id, reserva_id, informacoes, quantidade, status, voucher FROM eventos_reservas'
  );
  return rows;
}

async function findById(eventoId, reservaId) {
  const db = getDatabase();
  const { rows: [row] } = await db.query(
    'SELECT evento_id, reserva_id, informacoes, quantidade, status, voucher FROM eventos_reservas WHERE evento_id = ? AND reserva_id = ?',
    [eventoId, reservaId]
  );
  return row;
}

async function generateUniqueVoucher(db) {
  let voucher;
  let exists = true;
  while (exists) {
    voucher = 'VX' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const { rows } = await db.query('SELECT 1 FROM eventos_reservas WHERE voucher = ?', [voucher]);
    exists = rows.length > 0;
  }
  return voucher;
}

async function findByVoucher(voucher) {
  const db = getDatabase();
  const { rows: [row] } = await db.query(
    `SELECT er.evento_id, er.reserva_id, er.informacoes, er.quantidade, er.status, er.voucher,
            e.nome_evento, e.data_evento, r.nome_hospede, r.numeroreservacm
       FROM eventos_reservas er
       JOIN eventos e ON er.evento_id = e.id
       JOIN reservas r ON er.reserva_id = r.id
      WHERE er.voucher = ?`,
    [voucher]
  );
  return row;
}

async function create({ eventoId, reservaId, informacoes, quantidade, status, voucher }) {
  const db = getDatabase();
  const code = voucher || await generateUniqueVoucher(db);
  await db.query(
    'INSERT INTO eventos_reservas (evento_id, reserva_id, informacoes, quantidade, status, voucher) VALUES (?, ?, ?, ?, ?, ?)',
    [eventoId, reservaId, informacoes || null, quantidade, status || 'Ativa', code]
  );
  return { evento_id: eventoId, reserva_id: reservaId, informacoes: informacoes || null, quantidade, status: status || 'Ativa', voucher: code };
}

async function update(eventoId, reservaId, { informacoes, quantidade, status }) {
  const db = getDatabase();
  const fields = [];
  const values = [];

  if (informacoes !== undefined) {
    fields.push('informacoes = ?');
    values.push(informacoes);
  }
  if (quantidade !== undefined) {
    fields.push('quantidade = ?');
    values.push(quantidade);
  }
  if (status !== undefined) {
    fields.push('status = ?');
    values.push(status);
  }

  if (fields.length === 0) {
    return 0;
  }

  values.push(eventoId, reservaId);
  const sql = `UPDATE eventos_reservas SET ${fields.join(', ')} WHERE evento_id = ? AND reserva_id = ?`;
  const result = await db.query(sql, values);
  return result.rowCount;
}

async function remove(eventoId, reservaId) {
  const db = getDatabase();
  const result = await db.query(
    'DELETE FROM eventos_reservas WHERE evento_id = ? AND reserva_id = ?',
    [eventoId, reservaId]
  );
  return result.rowCount;
}

module.exports = {
  findAll,
  findById,
  findByVoucher,
  create,
  update,
  remove
};
