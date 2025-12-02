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
          code: 'PERMITIR_QUANTIDADE_MAIOR_HOSPEDES',
          nome: 'Permite cadastro de reserva com número informado maior que número de hóspedes no apartamento',
          descricao: 'Quando habilitada, permite marcar quantidade de lugares maior do que o número de hóspedes da reserva.',
          valor: 'true',
          habilitado: 1
        },
        {
          code: 'PERMITIR_APTO_MULTI_RESERVAS',
          nome: 'Permitir o mesmo apartamento marcar duas ou mais reservas',
          descricao: 'Quando habilitada, permite que o mesmo apartamento esteja vinculado a mais de uma reserva/evento.',
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

    // Garante que só as duas diretrizes desejadas existam
    const allowedCodes = [
      'PERMITIR_QUANTIDADE_MAIOR_HOSPEDES',
      'PERMITIR_APTO_MULTI_RESERVAS'
    ];
    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM diretrizes WHERE code NOT IN (?, ?)',
        allowedCodes,
        (err) => (err ? reject(err) : resolve())
      );
    });

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

