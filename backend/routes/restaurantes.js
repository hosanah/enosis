const express = require('express');
const { getDatabase } = require('../config/database');
const { ApiError } = require('../middleware/errorHandler');

const router = express.Router();

function isValidInt(value) {
  return Number.isInteger(Number(value));
}

// List all restaurants with pagination
router.get('/', (req, res, next) => {
  const db = getDatabase();
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = (page - 1) * limit;

  db.all(
    'SELECT id, nome, capacidade, descricao FROM restaurantes LIMIT ? OFFSET ?',
    [limit, offset],
    (err, rows) => {
      if (err) {
        console.error('❌ Erro ao listar restaurantes:', err.message);
        return next(new ApiError(500, 'Erro ao listar restaurantes', 'LIST_RESTAURANTS_ERROR', err.message));
      }
      db.get('SELECT COUNT(*) as count FROM restaurantes', [], (err2, result) => {
        if (err2) {
          console.error('❌ Erro ao contar restaurantes:', err2.message);
          return next(new ApiError(500, 'Erro ao listar restaurantes', 'LIST_RESTAURANTS_ERROR', err2.message));
        }
        res.json({ data: rows, total: result.count });
      });
    }
  );
});

// Get single restaurant
router.get('/:id', (req, res, next) => {
  if (!isValidInt(req.params.id)) {
    return next(new ApiError(400, 'ID inválido', 'INVALID_ID'));
  }
  const db = getDatabase();
  db.get('SELECT id, nome, capacidade, descricao FROM restaurantes WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      console.error('❌ Erro ao obter restaurante:', err.message);
      return next(new ApiError(500, 'Erro ao obter restaurante', 'GET_RESTAURANT_ERROR', err.message));
    }
    if (!row) {
      return next(new ApiError(404, 'Restaurante não encontrado', 'RESTAURANT_NOT_FOUND'));
    }
    res.json(row);
  });
});

// Create restaurant
router.post('/', (req, res, next) => {
  const { nome, capacidade, descricao } = req.body;
  if (!nome || !isValidInt(capacidade)) {
    return next(new ApiError(400, 'Nome e capacidade inteira são obrigatórios', 'MISSING_FIELDS'));
  }
  const db = getDatabase();
  db.run(
    'INSERT INTO restaurantes (nome, capacidade, descricao) VALUES (?, ?, ?) RETURNING id',
    [nome, capacidade, descricao || null],
    function(err) {
      if (err) {
        console.error('❌ Erro ao criar restaurante:', err.message);
        return next(new ApiError(500, 'Erro ao criar restaurante', 'CREATE_RESTAURANT_ERROR', err.message));
      }
      res.status(201).json({ id: this.lastID, nome, capacidade, descricao: descricao || null });
    }
  );
});

// Update restaurant
router.put('/:id', (req, res, next) => {
  if (!isValidInt(req.params.id)) {
    return next(new ApiError(400, 'ID inválido', 'INVALID_ID'));
  }
  const { nome, capacidade, descricao } = req.body;
  const fields = [];
  const values = [];
  if (nome) { fields.push('nome = ?'); values.push(nome); }
  if (capacidade !== undefined) {
    if (!isValidInt(capacidade)) {
      return next(new ApiError(400, 'Capacidade deve ser um inteiro', 'INVALID_CAPACITY'));
    }
    fields.push('capacidade = ?');
    values.push(capacidade);
  }
  if (descricao !== undefined) { fields.push('descricao = ?'); values.push(descricao); }
  if (fields.length === 0) {
    return next(new ApiError(400, 'Nenhum dado para atualizar', 'NO_FIELDS_TO_UPDATE'));
  }
  values.push(req.params.id);
  const sql = `UPDATE restaurantes SET ${fields.join(', ')} WHERE id = ?`;
  const db = getDatabase();
  db.run(sql, values, function(err) {
    if (err) {
      console.error('❌ Erro ao atualizar restaurante:', err.message);
      return next(new ApiError(500, 'Erro ao atualizar restaurante', 'UPDATE_RESTAURANT_ERROR', err.message));
    }
    if (this.changes === 0) {
      return next(new ApiError(404, 'Restaurante não encontrado', 'RESTAURANT_NOT_FOUND'));
    }
    res.json({ message: 'Restaurante atualizado com sucesso' });
  });
});

// Delete restaurant
router.delete('/:id', (req, res, next) => {
  if (!isValidInt(req.params.id)) {
    return next(new ApiError(400, 'ID inválido', 'INVALID_ID'));
  }
  const db = getDatabase();
  db.run('DELETE FROM restaurantes WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      console.error('❌ Erro ao deletar restaurante:', err.message);
      return next(new ApiError(500, 'Erro ao deletar restaurante', 'DELETE_RESTAURANT_ERROR', err.message));
    }
    if (this.changes === 0) {
      return next(new ApiError(404, 'Restaurante não encontrado', 'RESTAURANT_NOT_FOUND'));
    }
    res.json({ message: 'Restaurante deletado com sucesso' });
  });
});

module.exports = router;
