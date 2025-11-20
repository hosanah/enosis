const { getAuthDb } = require('./authdb');

async function seedDiretrizes() {
  const db = getAuthDb();
  // cria registros padrão apenas se não existirem
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

module.exports = { seedDiretrizes };

