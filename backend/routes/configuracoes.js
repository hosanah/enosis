const express = require('express');
const { getDatabase } = require('../config/database');
const { ApiError } = require('../middleware/errorHandler');

const router = express.Router();

function isValidInt(value) {
  return Number.isInteger(Number(value));
}

router.get('/', (req, res, next) => {
  const db = getDatabase();
  db.get(
    'SELECT id, nome_sistema, webhook_whatsapp, contato, cnpj, tempo_atualizacao_pms, nome_agenda_virtual FROM configuracoes WHERE id = 1',
    [],
    (err, row) => {
      if (err) {
        console.error('❌ Erro ao obter configurações:', err.message);
        return next(new ApiError(500, 'Erro ao obter configurações', 'GET_CONFIG_ERROR', err.message));
      }
      res.json(row);
    }
  );
});

router.put('/', (req, res, next) => {
  const { nome_sistema, webhook_whatsapp, contato, cnpj, tempo_atualizacao_pms, nome_agenda_virtual } = req.body;
  const fields = [];
  const values = [];

  if (nome_sistema !== undefined) { fields.push('nome_sistema = ?'); values.push(nome_sistema); }
  if (webhook_whatsapp !== undefined) { fields.push('webhook_whatsapp = ?'); values.push(webhook_whatsapp); }
  if (contato !== undefined) { fields.push('contato = ?'); values.push(contato); }
  if (cnpj !== undefined) { fields.push('cnpj = ?'); values.push(cnpj); }
  if (tempo_atualizacao_pms !== undefined) {
    if (!isValidInt(tempo_atualizacao_pms)) {
      return next(new ApiError(400, 'tempo_atualizacao_pms deve ser um inteiro', 'INVALID_TEMPO_ATUALIZACAO'));
    }
    fields.push('tempo_atualizacao_pms = ?');
    values.push(tempo_atualizacao_pms);
  }
  if (nome_agenda_virtual !== undefined) { fields.push('nome_agenda_virtual = ?'); values.push(nome_agenda_virtual); }

  if (fields.length === 0) {
    return next(new ApiError(400, 'Nenhum dado para atualizar', 'NO_FIELDS_TO_UPDATE'));
  }

  values.push(1);
  const sql = `UPDATE configuracoes SET ${fields.join(', ')} WHERE id = ?`;
  const db = getDatabase();
  db.run(sql, values, function(err) {
    if (err) {
      console.error('❌ Erro ao atualizar configurações:', err.message);
      return next(new ApiError(500, 'Erro ao atualizar configurações', 'UPDATE_CONFIG_ERROR', err.message));
    }
    res.json({ message: 'Configurações atualizadas com sucesso' });
  });
});

module.exports = router;
