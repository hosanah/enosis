const express = require('express');
const { getDatabase } = require('../config/database');
const { ApiError } = require('../middleware/errorHandler');

const router = express.Router();

function isValidInt(value) {
  return Number.isInteger(Number(value));
}

// List all guidelines with pagination
router.get('/', (req, res, next) => {
  const db = getDatabase();
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (page - 1) * limit;

  db.all(
    'SELECT id, descricao, ativo FROM diretrizes LIMIT ? OFFSET ?',
    [limit, offset],
    (err, rows) => {
      if (err) {
        console.error('❌ Erro ao listar diretrizes:', err.message);
        return next(new ApiError(500, 'Erro ao listar diretrizes', 'LIST_GUIDELINES_ERROR', err.message));
      }
      db.get('SELECT COUNT(*) as count FROM diretrizes', [], (err2, result) => {
        if (err2) {
          console.error('❌ Erro ao contar diretrizes:', err2.message);
          return next(new ApiError(500, 'Erro ao listar diretrizes', 'LIST_GUIDELINES_ERROR', err2.message));
        }
        res.json({ data: rows, total: result.count });
      });
    }
  );
});

// Get single guideline
router.get('/:id', (req, res, next) => {
  if (!isValidInt(req.params.id)) {
    return next(new ApiError(400, 'ID inválido', 'INVALID_ID'));
  }
  const db = getDatabase();
  db.get('SELECT id, descricao, ativo FROM diretrizes WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      console.error('❌ Erro ao obter diretriz:', err.message);
      return next(new ApiError(500, 'Erro ao obter diretriz', 'GET_GUIDELINE_ERROR', err.message));
    }
    if (!row) {
      return next(new ApiError(404, 'Diretriz não encontrada', 'GUIDELINE_NOT_FOUND'));
    }
    res.json(row);
  });
});

// Create guideline
router.post('/', (req, res, next) => {
  const { descricao, ativo } = req.body;
  if (!descricao) {
    return next(new ApiError(400, 'Descrição é obrigatória', 'MISSING_FIELDS'));
  }
  const db = getDatabase();
  db.run(
    'INSERT INTO diretrizes (descricao, ativo) VALUES (?, ?) RETURNING id',
    [descricao, ativo !== undefined ? ativo : true],
    function(err) {
      if (err) {
        console.error('❌ Erro ao criar diretriz:', err.message);
        return next(new ApiError(500, 'Erro ao criar diretriz', 'CREATE_GUIDELINE_ERROR', err.message));
      }
      res.status(201).json({ id: this.lastID, descricao, ativo: ativo !== undefined ? ativo : true });
    }
  );
});

// Update guideline
router.put('/:id', (req, res, next) => {
  if (!isValidInt(req.params.id)) {
    return next(new ApiError(400, 'ID inválido', 'INVALID_ID'));
  }
  const { descricao, ativo } = req.body;
  const fields = [];
  const values = [];
  if (descricao !== undefined) { fields.push('descricao = ?'); values.push(descricao); }
  if (ativo !== undefined) { fields.push('ativo = ?'); values.push(ativo); }
  if (fields.length === 0) {
    return next(new ApiError(400, 'Nenhum dado para atualizar', 'NO_FIELDS_TO_UPDATE'));
  }
  values.push(req.params.id);
  const sql = `UPDATE diretrizes SET ${fields.join(', ')} WHERE id = ?`;
  const db = getDatabase();
  db.run(sql, values, function(err) {
    if (err) {
      console.error('❌ Erro ao atualizar diretriz:', err.message);
      return next(new ApiError(500, 'Erro ao atualizar diretriz', 'UPDATE_GUIDELINE_ERROR', err.message));
    }
    if (this.changes === 0) {
      return next(new ApiError(404, 'Diretriz não encontrada', 'GUIDELINE_NOT_FOUND'));
    }
    res.json({ message: 'Diretriz atualizada com sucesso' });
  });
});

// Delete guideline
router.delete('/:id', (req, res, next) => {
  if (!isValidInt(req.params.id)) {
    return next(new ApiError(400, 'ID inválido', 'INVALID_ID'));
  }
  const db = getDatabase();
  db.run('DELETE FROM diretrizes WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      console.error('❌ Erro ao deletar diretriz:', err.message);
      return next(new ApiError(500, 'Erro ao deletar diretriz', 'DELETE_GUIDELINE_ERROR', err.message));
    }
    if (this.changes === 0) {
      return next(new ApiError(404, 'Diretriz não encontrada', 'GUIDELINE_NOT_FOUND'));
    }
    res.json({ message: 'Diretriz deletada com sucesso' });
  });
});

module.exports = router;
