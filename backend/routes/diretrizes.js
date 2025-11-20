const express = require('express');
const router = express.Router();
const { getAuthDb } = require('../config/authdb');

// Lista diretrizes; se vazio, cria padrões
router.get('/', async (req, res) => {
  try {
    const db = getAuthDb();
    const list = await new Promise((resolve, reject) => {
      db.all('SELECT code, nome, descricao, valor, habilitado FROM diretrizes ORDER BY nome', [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });

    if (!list || list.length === 0) {
      const defaults = [
        {
          code: 'MAX_ITENS_POR_RESERVA',
          nome: 'Máximo de itens por reserva',
          descricao: 'Quantidade máxima de lugares que uma única reserva pode marcar em uma mesa.',
          valor: '6',
          habilitado: 1
        },
        {
          code: 'EXIGIR_RESERVA_ATIVA',
          nome: 'Exigir reserva ativa',
          descricao: 'Apenas reservas com status ativo/pago podem marcar mesa.',
          valor: 'true',
          habilitado: 1
        },
        {
          code: 'BLOQUEAR_RESERVA_REPETIDA',
          nome: 'Bloquear reserva repetida em mesas distintas',
          descricao: 'Impede que a mesma reserva marque lugares em mais de uma mesa diferente.',
          valor: 'true',
          habilitado: 1
        }
      ];
      for (const d of defaults) {
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT OR IGNORE INTO diretrizes (code, nome, descricao, valor, habilitado) VALUES (?, ?, ?, ?, ?)',
            [d.code, d.nome, d.descricao, d.valor, d.habilitado],
            (err) => (err ? reject(err) : resolve())
          );
        });
      }
    }

    const refreshed = await new Promise((resolve, reject) => {
      db.all('SELECT code, nome, descricao, valor, habilitado FROM diretrizes ORDER BY nome', [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
    res.json({ data: refreshed });
  } catch (err) {
    console.error('Erro ao listar diretrizes:', err);
    res.status(500).json({ error: 'Falha ao listar diretrizes.' });
  }
});

// Atualiza somente habilitado
router.patch('/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const { habilitado } = req.body || {};
    if (typeof habilitado !== 'boolean') {
      return res.status(400).json({ error: 'Campo habilitado é obrigatório e deve ser booleano.' });
    }
    const db = getAuthDb();

    const exists = await new Promise((resolve, reject) => {
      db.get('SELECT code FROM diretrizes WHERE code = ?', [code], (err, row) => {
        if (err) return reject(err);
        resolve(!!row);
      });
    });
    if (!exists) return res.status(404).json({ error: 'Diretriz não encontrada.' });

    await new Promise((resolve, reject) => {
      db.run('UPDATE diretrizes SET habilitado = ?, updated_at = CURRENT_TIMESTAMP WHERE code = ?', [habilitado ? 1 : 0, code], (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    const updated = await new Promise((resolve, reject) => {
      db.get('SELECT code, nome, descricao, valor, habilitado FROM diretrizes WHERE code = ?', [code], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
    res.json({ data: updated });
  } catch (err) {
    console.error('Erro ao atualizar diretriz:', err);
    res.status(500).json({ error: 'Falha ao atualizar diretriz.' });
  }
});

module.exports = router;

