const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const authDb = require('../config/authdb');
const { initWhatsApp } = require('../services/whatsapp');

test('rotas cobrem configuração, prévia e envio simulado pela Evolution', async (t) => {
  const db = new sqlite3.Database(':memory:');
  await initWhatsApp(db);
  authDb.getAuthDb = () => db;
  process.env.EVOLUTION_API_URL = 'https://evolution.test';
  process.env.EVOLUTION_API_KEY = 'test-key';
  const originalFetch = global.fetch;
  const sent = [];
  let createCalls = 0;
  global.fetch = async (url, options = {}) => {
    if (url.endsWith('/instance/create')) {
      createCalls++;
      return { ok: true, json: async () => ({ instance: { instanceName: 'enosis-whatsapp', status: 'created' }, qrcode: { base64: 'data:image/png;base64,qr' } }) };
    }
    if (url.includes('/instance/connectionState/')) return { ok: true, json: async () => ({ instance: { state: 'open' } }) };
    if (url.includes('/instance/connect/')) return { ok: true, json: async () => ({ qrcode: { base64: 'data:image/png;base64,qr' } }) };
    if (url.includes('/instance/delete/')) return { ok: true, json: async () => ({ status: 'SUCCESS' }) };
    sent.push({ url, options, body: JSON.parse(options.body) });
    return { ok: true, json: async () => ({ key: { id: `msg-${sent.length}` } }) };
  };
  const app = express();
  app.use(express.json());
  app.use('/whatsapp', require('../routes/whatsapp'));
  const server = app.listen(0);
  t.after(() => { server.close(); db.close(); global.fetch = originalFetch; });
  const base = `http://127.0.0.1:${server.address().port}/whatsapp`;
  const request = (path, options) => originalFetch(`${base}${path}`, options);

  const initial = await request('/config').then((response) => response.json());
  assert.equal(initial.data.action, 'print');
  assert.equal(initial.data.evolutionConfigured, true);

  const created = await request('/instance', { method: 'POST' }).then((response) => response.json());
  assert.equal(created.data.name, 'enosis-whatsapp');
  assert.equal(created.data.qrcode, 'data:image/png;base64,qr');
  assert.equal(createCalls, 1);

  const status = await request('/instance/status').then((response) => response.json());
  assert.equal(status.data.status, 'open');
  assert.equal(status.data.name, 'enosis-whatsapp');

  const duplicate = await request('/instance', { method: 'POST' });
  assert.equal(duplicate.status, 409);
  assert.equal(createCalls, 1);

  const updated = await request('/config', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'both', templates: { natal: 'Olá {{hospede}}', anonovo: 'Oi {{hospede}}' } }) }).then((response) => response.json());
  assert.equal(updated.data.action, 'both');

  const payload = { evento: 'natal', telefone: '(81) 99999-1234', data: { nome_hospede: 'Ana', coduh: 'A12', numreserva: '42', nummesa: 8, quantidade: 3 } };
  const preview = await request('/preview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }).then((response) => response.json());
  assert.equal(preview.data.telefone, '(81) 99999-1234');
  assert.match(preview.data.mensagem, /Olá Ana/);
  assert.match(preview.data.voucher, /Mesa: 8/);

  const previewWithoutPhone = await request('/preview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...payload, telefone: '+55' }) });
  assert.equal(previewWithoutPhone.status, 200);
  assert.match((await previewWithoutPhone.json()).data.mensagem, /Ana/);

  const sentResult = await request('/send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }).then((response) => response.json());
  assert.equal(sentResult.textMessageId, 'msg-1');
  assert.equal(sentResult.messageId, 'msg-2');
  assert.equal(sent.length, 2);
  assert.equal(sent[0].url, 'https://evolution.test/message/sendText/enosis-whatsapp');
  assert.equal(sent[0].body.number, '5581999991234');
  assert.match(sent[0].body.text, /Ana/);
  assert.doesNotMatch(sent[0].body.text, /VOUCHER NATAL/);
  assert.equal(sent[1].url, 'https://evolution.test/message/sendMedia/enosis-whatsapp');
  assert.equal(sent[1].body.mediatype, 'document');
  assert.equal(sent[1].body.mimetype, 'application/pdf');
  assert.match(sent[1].body.fileName, /voucher-natal-42\.pdf/);
  assert.equal(Buffer.from(sent[1].body.media, 'base64').subarray(0, 5).toString(), '%PDF-');

  const deleted = await request('/instance', { method: 'DELETE' }).then((response) => response.json());
  assert.equal(deleted.ok, true);
  const finalStatus = await request('/instance/status').then((response) => response.json());
  assert.equal(finalStatus.data.exists, false);
});
