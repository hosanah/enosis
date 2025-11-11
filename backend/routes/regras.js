const express = require('express');
const { getDatabase } = require('../config/database');
const { ApiError } = require('../middleware/errorHandler');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const db = getDatabase();
    const { rows } = await db.query('SELECT id, chave, descricao, ativo FROM regras_validacao ORDER BY id');
    res.json(rows);
  } catch (err) {
    console.error('❌ Erro ao listar regras:', err.message);
    next(new ApiError(500, 'Erro ao listar regras', 'LIST_REGRAS_ERROR', err.message));
  }
});

router.put('/:id', async (req, res, next) => {
  const { id } = req.params;
  const { ativo } = req.body;
  if (ativo === undefined) {
    return next(new ApiError(400, 'Campo ativo é obrigatório', 'MISSING_FIELDS'));
  }
  try {
    const db = getDatabase();
    const result = await db.query('UPDATE regras_validacao SET ativo = ? WHERE id = ?', [ativo, id]);
    if (result.rowCount === 0) {
      return next(new ApiError(404, 'Regra não encontrada', 'RULE_NOT_FOUND'));
    }
    res.json({ message: 'Regra atualizada com sucesso' });
  } catch (err) {
    console.error('❌ Erro ao atualizar regra:', err.message);
    next(new ApiError(500, 'Erro ao atualizar regra', 'UPDATE_REGRA_ERROR', err.message));
  }
});

module.exports = router;
