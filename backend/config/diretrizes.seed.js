const defaults = [
  {
    code: 'PERMITIR_QUANTIDADE_MAIOR_HOSPEDES',
    nome: 'Permite cadastro de reserva com número informado maior que número de hóspedes no apartamento',
    descricao:
      'Quando habilitada, permite marcar quantidade de lugares maior do que o número de hóspedes da reserva.',
    valor: 'true',
    habilitado: 1
  },
  {
    code: 'PERMITIR_APTO_MULTI_RESERVAS',
    nome: 'Permitir o mesmo apartamento marcar duas ou mais reservas',
    descricao:
      'Quando habilitada, permite que o mesmo apartamento esteja vinculado a mais de uma reserva/evento.',
    valor: 'true',
    habilitado: 1
  }
];

async function seedDiretrizes(db) {
  if (!db || typeof db.run !== 'function') {
    throw new Error('seedDiretrizes requer uma instância de banco com método run(sql, params, cb)');
  }

  const allowedCodes = defaults.map((d) => d.code);

  // remove quaisquer diretrizes antigas que não façam parte do conjunto fixo
  await new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM diretrizes WHERE code NOT IN (?, ?)',
      allowedCodes,
      (err) => (err ? reject(err) : resolve())
    );
  });

  // garante existência das diretrizes fixas
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

module.exports = { seedDiretrizes };
