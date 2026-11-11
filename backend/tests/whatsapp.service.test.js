const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizePhone, renderTemplate, buildVoucherText, sendEvolutionMessage } = require('../services/whatsapp');

test('normaliza telefone brasileiro com DDI e remove máscara', () => {
  assert.equal(normalizePhone('(81) 99999-1234'), '5581999991234');
  assert.equal(normalizePhone('+55 81 99999-1234'), '5581999991234');
});

test('rejeita telefone sem número suficiente', () => {
  assert.throws(() => normalizePhone('123'), /telefone/i);
});

test('renderiza placeholders sem alterar placeholders desconhecidos', () => {
  assert.equal(renderTemplate('Olá {{hospede}}, mesa {{mesa}} / {{x}}', { hospede: 'Ana', mesa: 4 }), 'Olá Ana, mesa 4 / {{x}}');
});

test('monta voucher com dados principais da marcação', () => {
  const voucher = buildVoucherText({ evento: 'Natal', nome_hospede: 'Ana', coduh: 'A12', nummesa: 8, quantidade: 3 });
  assert.match(voucher, /Natal/i);
  assert.match(voucher, /Mesa: 8/);
  assert.match(voucher, /Apartamento: A12/);
});

test('envia mensagem à Evolution com instância e chave configuradas', async () => {
  let request;
  const result = await sendEvolutionMessage({ baseUrl: 'https://evolution.local', instance: 'hotel', apiKey: 'secret', phone: '5581999991234', text: 'Olá' }, async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ key: { id: 'm1' } }) };
  });
  assert.equal(request.url, 'https://evolution.local/message/sendText/hotel');
  assert.equal(request.options.headers.apikey, 'secret');
  assert.deepEqual(JSON.parse(request.options.body), { number: '5581999991234', text: 'Olá' });
  assert.equal(result.key.id, 'm1');
});

test('propaga erro HTTP da Evolution sem fingir envio bem-sucedido', async () => {
  await assert.rejects(() => sendEvolutionMessage({ baseUrl: 'https://evolution.local', instance: 'hotel', apiKey: 'secret', phone: '5581999991234', text: 'Olá' }, async () => ({ ok: false, status: 503, text: async () => 'indisponível' })), /503/);
});
