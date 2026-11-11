const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const DEFAULT_TEMPLATES = {
  natal: `🎄✨ *Seu Natal está confirmado!* ✨🎄

Olá, *{{hospede}}*! 👋😊

É com muita alegria que confirmamos sua reserva para a nossa *Celebração de Natal*! 🎅🎁

📋 *Detalhes da sua reserva:*

🍽️ *Mesa:* {{mesa}}
🏨 *Apartamento:* {{apartamento}}
👨‍👩‍👧‍👦 *Quantidade de pessoas:* {{quantidade}}
🔖 *Nº da reserva:* {{reserva}}

✨ Estamos preparando uma noite especial, repleta de encanto, alegria e momentos inesquecíveis para você e sua família! ❤️

💚 *Agradecemos pela confiança e por escolher celebrar essa data tão especial conosco!*

🎅🎄 Desejamos a você e sua família um *Feliz Natal!* 🌟`,
  anonovo: `🥂✨ *Seu Réveillon está confirmado!* ✨🎆

Olá, *{{hospede}}*! 👋😊

É com muita alegria que confirmamos sua reserva para a nossa *Celebração de Ano-Novo*! 🎉🍾

📋 *Detalhes da sua reserva:*

🍽️ *Mesa:* {{mesa}}
🏨 *Apartamento:* {{apartamento}}
👨‍👩‍👧‍👦 *Quantidade de pessoas:* {{quantidade}}
🔖 *Nº da reserva:* {{reserva}}

✨ Estamos preparando uma noite inesquecível para celebrar a chegada de um novo ano, com muita alegria, boas energias e momentos especiais! 🌟

💚 *Agradecemos pela confiança e por escolher começar o novo ano conosco!*

🥂🎆 Que 2027 seja um ano de *paz, saúde, felicidade e muitas realizações!* ✨`
};
const PREVIOUS_DEFAULT_TEMPLATES = {
  natal: 'Olá {{hospede}}! Sua marcação de Natal foi confirmada. Mesa {{mesa}}, apartamento {{apartamento}}, para {{quantidade}} pessoa(s). Reserva {{reserva}}.',
  anonovo: 'Olá {{hospede}}! Sua marcação de Ano-Novo foi confirmada. Mesa {{mesa}}, apartamento {{apartamento}}, para {{quantidade}} pessoa(s). Reserva {{reserva}}.'
};
const MANAGED_INSTANCE_NAME = 'enosis-whatsapp';

function normalizePhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (!digits.startsWith('55')) digits = `55${digits}`;
  if (digits.length < 12 || digits.length > 15) throw new Error('Informe um telefone válido com DDI e DDD.');
  return digits;
}

function renderTemplate(template, values = {}) {
  return String(template || '').replace(/\{\{\s*([\w]+)\s*\}\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key] ?? '') : match
  );
}

function buildVoucherText(data = {}) {
  const evento = data.evento === 'anonovo' ? 'Ano-Novo' : 'Natal';
  return [
    `VOUCHER ${evento.toUpperCase()}`,
    `Hóspede: ${data.nome_hospede || '-'}`,
    `Apartamento: ${data.coduh || '-'}`,
    `Reserva: ${data.numreserva || '-'}`,
    `Mesa: ${data.nummesa || '-'}`,
    `Pessoas: ${data.quantidade || 0}`,
    data.observacoes ? `Observação: ${data.observacoes}` : ''
  ].filter(Boolean).join('\n');
}

function buildVoucherPdf(data = {}) {
  const event = data.evento === 'anonovo' ? 'Ano-Novo' : 'Natal';
  const logoPath = [
    path.join(__dirname, '../assets/logotipo.png'),
    path.join(__dirname, '../../frontend/public/logotipo.png')
  ].find((candidate) => fs.existsSync(candidate));

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A5', margin: 38, info: { Title: `Voucher ${event}` } });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const margin = 38;
    const width = doc.page.width - margin * 2;
    const green = '#16865b';
    doc.roundedRect(24, 24, doc.page.width - 48, doc.page.height - 48, 12).lineWidth(1).stroke('#d5e5da');
    if (logoPath) doc.image(logoPath, margin, 38, { fit: [125, 48], align: 'left', valign: 'center' });
    doc.fillColor(green).font('Helvetica-Bold').fontSize(17).text('VOUCHER DE RESERVA', margin, 102, { width, align: 'center' });
    doc.fillColor('#35463b').font('Helvetica').fontSize(11).text(`Celebração de ${event}`, margin, 126, { width, align: 'center' });
    const welcome = event === 'Natal'
      ? 'Uma noite especial, repleta de encanto e momentos inesquecíveis espera por você e sua família.'
      : 'Uma celebração inesquecível para receber o novo ano com alegria e boas energias.';
    doc.fillColor('#586a5f').fontSize(9).text(welcome, margin + 8, 153, { width: width - 16, align: 'center', lineGap: 2 });

    const gap = 10;
    const fieldWidth = (width - gap) / 2;
    const fields = [
      ['HÓSPEDE', data.nome_hospede || '-'],
      ['APARTAMENTO', data.coduh || '-'],
      ['NÚMERO DA RESERVA', data.numreserva || '-'],
      ['MESA', data.nummesa || '-'],
      ['QUANTIDADE DE PESSOAS', data.quantidade || 0]
    ];
    const startY = 202;
    const fieldHeight = 50;
    fields.forEach(([label, value], index) => {
      const isLast = index === fields.length - 1;
      const x = isLast ? margin : margin + (index % 2) * (fieldWidth + gap);
      const y = startY + Math.floor(index / 2) * (fieldHeight + 9);
      const boxWidth = isLast ? width : fieldWidth;
      doc.roundedRect(x, y, boxWidth, fieldHeight, 7).fillAndStroke('#f5faf6', '#e0ebe3');
      doc.fillColor(green).font('Helvetica-Bold').fontSize(7).text(label, x + 10, y + 9, { width: boxWidth - 20 });
      doc.fillColor('#263a2e').font('Helvetica-Bold').fontSize(11).text(String(value), x + 10, y + 23, { width: boxWidth - 20, ellipsis: true });
    });

    const closing = event === 'Natal'
      ? 'A família Enotel deseja a você e sua família um Feliz Natal!'
      : 'Desejamos um novo ano de paz, saúde, felicidade e realizações!';
    doc.fillColor(green).font('Helvetica-Bold').fontSize(9).text(closing, margin, 390, { width, align: 'center' });
    doc.fillColor('#718078').font('Helvetica').fontSize(7).text('Apresente este voucher no local da celebração.', margin, 410, { width, align: 'center' });
    doc.end();
  });
}

async function sendEvolutionMessage(config, fetchImpl = globalThis.fetch) {
  if (!config.baseUrl || !config.instance || !config.apiKey) throw new Error('Evolution API não configurada ou instância não criada.');
  if (typeof fetchImpl !== 'function') throw new Error('Cliente HTTP indisponível para Evolution API.');
  const baseUrl = String(config.baseUrl).replace(/\/+$/, '');
  const url = `${baseUrl}/message/sendText/${encodeURIComponent(config.instance)}`;
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: config.apiKey },
    body: JSON.stringify({ number: normalizePhone(config.phone), text: config.text })
  });
  if (!response.ok) {
    const detail = typeof response.text === 'function' ? await response.text() : '';
    throw new Error(`Evolution API respondeu ${response.status}${detail ? `: ${detail}` : ''}`);
  }
  return response.json();
}

async function sendEvolutionDocument(config, fetchImpl = globalThis.fetch) {
  if (!config.baseUrl || !config.instance || !config.apiKey) throw new Error('Evolution API não configurada ou instância não criada.');
  if (!config.pdfBuffer) throw new Error('O voucher PDF não foi gerado.');
  if (typeof fetchImpl !== 'function') throw new Error('Cliente HTTP indisponível para Evolution API.');
  const baseUrl = String(config.baseUrl).replace(/\/+$/, '');
  const url = `${baseUrl}/message/sendMedia/${encodeURIComponent(config.instance)}`;
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: config.apiKey },
    body: JSON.stringify({
      number: normalizePhone(config.phone),
      mediatype: 'document',
      mimetype: 'application/pdf',
      caption: config.caption || 'Segue o voucher da sua reserva em PDF.',
      media: Buffer.from(config.pdfBuffer).toString('base64'),
      fileName: config.fileName || 'voucher.pdf'
    })
  });
  if (!response.ok) {
    const detail = typeof response.text === 'function' ? await response.text() : '';
    throw new Error(`Evolution API respondeu ${response.status}${detail ? `: ${detail}` : ''}`);
  }
  return response.json();
}

function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => db.run(sql, params, function (error) { error ? reject(error) : resolve(this); }));
}
function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => db.get(sql, params, (error, row) => error ? reject(error) : resolve(row)));
}

async function initWhatsApp(db) {
  await dbRun(db, `CREATE TABLE IF NOT EXISTS whatsapp_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1), action TEXT NOT NULL DEFAULT 'print',
    template_natal TEXT NOT NULL, template_anonovo TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await dbRun(db, `INSERT OR IGNORE INTO whatsapp_settings (id, action, template_natal, template_anonovo)
    VALUES (1, 'print', ?, ?)`, [DEFAULT_TEMPLATES.natal, DEFAULT_TEMPLATES.anonovo]);
  await dbRun(db, `UPDATE whatsapp_settings
    SET template_natal = CASE WHEN template_natal = ? THEN ? ELSE template_natal END,
        template_anonovo = CASE WHEN template_anonovo = ? THEN ? ELSE template_anonovo END
    WHERE id = 1`, [
    PREVIOUS_DEFAULT_TEMPLATES.natal, DEFAULT_TEMPLATES.natal,
    PREVIOUS_DEFAULT_TEMPLATES.anonovo, DEFAULT_TEMPLATES.anonovo
  ]);
  await dbRun(db, `CREATE TABLE IF NOT EXISTS whatsapp_instance (
    id INTEGER PRIMARY KEY CHECK (id = 1), name TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'creating', updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await dbRun(db, `CREATE TABLE IF NOT EXISTS whatsapp_send_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evento TEXT NOT NULL,
    hospede TEXT NOT NULL DEFAULT '',
    telefone TEXT NOT NULL DEFAULT '',
    reserva TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'error')),
    detalhe TEXT NOT NULL,
    message_id TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
}

async function getManagedInstance(db) {
  return dbGet(db, 'SELECT name, status FROM whatsapp_instance WHERE id = 1');
}

async function reserveManagedInstance(db) {
  return dbRun(db, 'INSERT INTO whatsapp_instance (id, name, status) VALUES (1, ?, ?)', [MANAGED_INSTANCE_NAME, 'creating']);
}

async function updateManagedInstance(db, status) {
  return dbRun(db, 'UPDATE whatsapp_instance SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1', [status]);
}

async function removeManagedInstance(db) {
  return dbRun(db, 'DELETE FROM whatsapp_instance WHERE id = 1');
}

function getEvolutionConfig() {
  const config = { baseUrl: process.env.EVOLUTION_API_URL, apiKey: process.env.EVOLUTION_API_KEY };
  if (!config.baseUrl || !config.apiKey) throw new Error('Configure EVOLUTION_API_URL e EVOLUTION_API_KEY no backend/.env.');
  return config;
}

async function evolutionRequest(path, options = {}, fetchImpl = globalThis.fetch) {
  const config = getEvolutionConfig();
  const response = await fetchImpl(`${String(config.baseUrl).replace(/\/+$/, '')}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', apikey: config.apiKey, ...(options.headers || {}) }
  });
  if (!response.ok) {
    const detail = typeof response.text === 'function' ? await response.text() : '';
    const error = new Error(`Evolution API respondeu ${response.status}${detail ? `: ${detail}` : ''}`);
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return {};
  return response.json();
}

async function createManagedInstance(db) {
  try {
    await reserveManagedInstance(db);
  } catch (error) {
    if (String(error.message || '').includes('UNIQUE') || String(error.message || '').includes('PRIMARY KEY')) {
      const conflict = new Error('A instância WhatsApp única da aplicação já existe.');
      conflict.status = 409;
      throw conflict;
    }
    throw error;
  }
  try {
    const result = await evolutionRequest('/instance/create', {
      method: 'POST',
      body: JSON.stringify({ instanceName: MANAGED_INSTANCE_NAME, integration: 'WHATSAPP-BAILEYS', qrcode: true })
    });
    const state = result?.instance?.status || 'created';
    await updateManagedInstance(db, state);
    return { name: MANAGED_INSTANCE_NAME, status: state, qrcode: result?.qrcode?.base64 || null };
  } catch (error) {
    await removeManagedInstance(db);
    throw error;
  }
}

async function getManagedInstanceStatus(db) {
  const row = await getManagedInstance(db);
  if (!row) return { exists: false, name: null, status: 'not_created', qrcode: null };
  try {
    const result = await evolutionRequest(`/instance/connectionState/${encodeURIComponent(row.name)}`);
    const status = result?.instance?.state || result?.instance?.status || row.status || 'unknown';
    await updateManagedInstance(db, status);
    let qrcode = null;
    if (status !== 'open') {
      const connection = await evolutionRequest(`/instance/connect/${encodeURIComponent(row.name)}`);
      qrcode = connection?.base64 || connection?.qrcode?.base64 || null;
    }
    return { exists: true, name: row.name, status, qrcode };
  } catch (error) {
    if (error.status === 404) {
      await removeManagedInstance(db);
      return { exists: false, name: null, status: 'not_created', qrcode: null };
    }
    throw error;
  }
}

async function deleteManagedInstance(db) {
  const row = await getManagedInstance(db);
  if (!row) return { ok: true, deleted: false };
  try {
    await evolutionRequest(`/instance/delete/${encodeURIComponent(row.name)}`, { method: 'DELETE' });
  } catch (error) {
    if (error.status !== 404) throw error;
  }
  await removeManagedInstance(db);
  return { ok: true, deleted: true };
}

async function getWhatsAppSettings(db) {
  const row = await dbGet(db, 'SELECT action, template_natal, template_anonovo FROM whatsapp_settings WHERE id = 1');
  return {
    action: row?.action || 'print',
    templates: { natal: row?.template_natal || DEFAULT_TEMPLATES.natal, anonovo: row?.template_anonovo || DEFAULT_TEMPLATES.anonovo }
  };
}

async function createWhatsAppSendLog(db, input = {}) {
  const result = await dbRun(db, `INSERT INTO whatsapp_send_log
    (evento, hospede, telefone, reserva, status, detalhe)
    VALUES (?, ?, ?, ?, 'pending', 'Envio em andamento.')`, [
    String(input.evento || 'desconhecido').slice(0, 30),
    String(input.hospede || '').slice(0, 200),
    String(input.telefone || '').slice(0, 40),
    String(input.reserva || '').slice(0, 80)
  ]);
  return result.lastID;
}

async function updateWhatsAppSendLog(db, id, status, detalhe, messageId = null) {
  await dbRun(db, `UPDATE whatsapp_send_log
    SET status = ?, detalhe = ?, message_id = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`, [status, String(detalhe || '').slice(0, 500), messageId ? String(messageId).slice(0, 200) : null, id]);
}

async function listWhatsAppSendLogs(db, page = 1, limit = 20) {
  const safePage = Math.max(Number.parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 20, 1), 100);
  const offset = (safePage - 1) * safeLimit;
  const [count, data] = await Promise.all([
    dbGet(db, 'SELECT COUNT(*) AS total FROM whatsapp_send_log'),
    new Promise((resolve, reject) => db.all(
      `SELECT id, evento, hospede, telefone, reserva, status, detalhe, message_id AS messageId, created_at AS createdAt
         FROM whatsapp_send_log ORDER BY id DESC LIMIT ? OFFSET ?`,
      [safeLimit, offset],
      (error, rows) => error ? reject(error) : resolve(rows || [])
    ))
  ]);
  const total = Number(count?.total || 0);
  return { data, pagination: { page: safePage, pageSize: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } };
}

async function saveWhatsAppSettings(db, input = {}) {
  const action = ['print', 'send', 'both'].includes(input.action) ? input.action : null;
  if (!action) throw new Error('Ação inválida. Use print, send ou both.');
  const templates = input.templates || {};
  const natal = String(templates.natal || '').trim();
  const anonovo = String(templates.anonovo || '').trim();
  if (!natal || !anonovo || natal.length > 2000 || anonovo.length > 2000) throw new Error('Informe os dois templates com até 2000 caracteres.');
  await dbRun(db, `UPDATE whatsapp_settings SET action = ?, template_natal = ?, template_anonovo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
    [action, natal, anonovo]);
  return getWhatsAppSettings(db);
}

module.exports = { DEFAULT_TEMPLATES, MANAGED_INSTANCE_NAME, normalizePhone, renderTemplate, buildVoucherText, buildVoucherPdf, sendEvolutionMessage, sendEvolutionDocument, initWhatsApp, getWhatsAppSettings, saveWhatsAppSettings, createWhatsAppSendLog, updateWhatsAppSendLog, listWhatsAppSendLogs, getEvolutionConfig, evolutionRequest, getManagedInstance, createManagedInstance, getManagedInstanceStatus, deleteManagedInstance };
