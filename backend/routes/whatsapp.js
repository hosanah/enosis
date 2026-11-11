const express = require('express');
const { getAuthDb } = require('../config/authdb');
const { getWhatsAppSettings, saveWhatsAppSettings, normalizePhone, renderTemplate, buildVoucherText, buildVoucherPdf, sendEvolutionMessage, sendEvolutionDocument, getManagedInstance, createManagedInstance, getManagedInstanceStatus, deleteManagedInstance, createWhatsAppSendLog, updateWhatsAppSendLog, listWhatsAppSendLogs } = require('../services/whatsapp');

const router = express.Router();
const events = ['natal', 'anonovo'];

function getValues(data = {}) {
  return {
    hospede: data.nome_hospede || '', mesa: data.nummesa || '', apartamento: data.coduh || '',
    quantidade: data.quantidade || '', reserva: data.numreserva || ''
  };
}

async function createPreview(evento, data, phone, validatePhone = true) {
  if (!events.includes(evento)) throw new Error('Evento inválido.');
  const settings = await getWhatsAppSettings(getAuthDb());
  const telefone = validatePhone ? normalizePhone(phone) : String(phone || '').trim();
  const mensagem = renderTemplate(settings.templates[evento], getValues(data));
  const voucher = buildVoucherText({ ...data, evento });
  return { telefone, mensagem, voucher };
}

function readableSendError(error) {
  const message = String(error?.message || 'Falha ao enviar pela Evolution API.').trim();
  if (/<!doctype|<html[\s>]/i.test(message)) {
    return 'A Evolution API retornou uma página HTML em vez de uma resposta de API. Verifique o endereço configurado.';
  }
  if (error?.cause?.code) {
    return `Não foi possível conectar à Evolution API (${error.cause.code}). Verifique o endereço e a conectividade.`;
  }
  return message.replace(/\s+/g, ' ').slice(0, 500);
}

router.get('/logs', async (req, res) => {
  try {
    const result = await listWhatsAppSendLogs(getAuthDb(), req.query.page, req.query.limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Não foi possível carregar o histórico de envios.' });
  }
});

router.get('/config', async (req, res) => {
  try {
    const settings = await getWhatsAppSettings(getAuthDb());
    const instance = await getManagedInstance(getAuthDb());
    res.json({ data: { ...settings, evolutionConfigured: !!(process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY), instanceExists: !!instance, instanceName: instance?.name || null, instanceStatus: instance?.status || 'not_created' } });
  } catch (error) { res.status(500).json({ error: 'Falha ao carregar configuração do WhatsApp.' }); }
});

router.post('/instance', async (req, res) => {
  try { res.status(201).json({ data: await createManagedInstance(getAuthDb()) }); }
  catch (error) { res.status(error.status || 502).json({ error: error.message || 'Falha ao criar instância WhatsApp.' }); }
});

router.get('/instance/status', async (req, res) => {
  try { res.json({ data: await getManagedInstanceStatus(getAuthDb()) }); }
  catch (error) { res.status(error.status || 502).json({ error: error.message || 'Falha ao consultar estado da instância.' }); }
});

router.delete('/instance', async (req, res) => {
  try { res.json(await deleteManagedInstance(getAuthDb())); }
  catch (error) { res.status(error.status || 502).json({ error: error.message || 'Falha ao apagar instância WhatsApp.' }); }
});

router.put('/config', async (req, res) => {
  try { res.json({ data: await saveWhatsAppSettings(getAuthDb(), req.body) }); }
  catch (error) { res.status(400).json({ error: error.message }); }
});

router.post('/preview', async (req, res) => {
  try { res.json({ data: await createPreview(req.body?.evento, req.body?.data, req.body?.telefone, false) }); }
  catch (error) { res.status(400).json({ error: error.message }); }
});

router.post('/send', async (req, res) => {
  const db = getAuthDb();
  const payload = req.body || {};
  let sendLogId = null;
  try {
    sendLogId = await createWhatsAppSendLog(db, {
      evento: payload.evento,
      hospede: payload.data?.nome_hospede,
      telefone: payload.telefone,
      reserva: payload.data?.numreserva
    });
  } catch (error) {
    console.error('Falha ao iniciar log de envio WhatsApp:', error.message);
  }

  let confirmationSent = false;
  try {
    const preview = await createPreview(payload.evento, payload.data, payload.telefone);
    const instance = await getManagedInstance(db);
    if (!instance) {
      const error = new Error('Crie e conecte a instância WhatsApp antes de enviar mensagens.');
      error.status = 409;
      throw error;
    }
    const voucherPdf = await buildVoucherPdf({ ...payload.data, evento: payload.evento });
    const textResult = await sendEvolutionMessage({
      baseUrl: process.env.EVOLUTION_API_URL,
      apiKey: process.env.EVOLUTION_API_KEY,
      instance: instance.name,
      phone: preview.telefone,
      text: preview.mensagem
    });
    confirmationSent = true;
    const voucherResult = await sendEvolutionDocument({
      baseUrl: process.env.EVOLUTION_API_URL,
      apiKey: process.env.EVOLUTION_API_KEY,
      instance: instance.name,
      phone: preview.telefone,
      pdfBuffer: voucherPdf,
      fileName: `voucher-${payload.evento}-${String(payload.data?.numreserva || 'reserva').replace(/[^a-zA-Z0-9_-]/g, '')}.pdf`,
      caption: 'Segue o voucher da sua reserva em PDF.'
    });
    const messageId = voucherResult?.key?.id || voucherResult?.message?.id || null;
    const textMessageId = textResult?.key?.id || textResult?.message?.id || null;
    const successMessage = `Mensagem e voucher PDF enviados com sucesso para ${preview.telefone}.`;
    if (sendLogId) {
      try { await updateWhatsAppSendLog(db, sendLogId, 'success', successMessage, messageId); }
      catch (error) { console.error('Falha ao atualizar log de envio WhatsApp:', error.message); }
    }
    res.json({ ok: true, telefone: preview.telefone, messageId, textMessageId, message: successMessage });
  } catch (error) {
    const errorDetail = readableSendError(error);
    const detail = confirmationSent
      ? `A mensagem de confirmação foi enviada, mas o voucher PDF falhou: ${errorDetail}`
      : errorDetail;
    if (sendLogId) {
      try { await updateWhatsAppSendLog(db, sendLogId, 'error', detail); }
      catch (logError) { console.error('Falha ao atualizar log de envio WhatsApp:', logError.message); }
    }
    res.status(error.status || 502).json({ error: detail, message: `Não foi possível enviar a mensagem: ${detail}` });
  }
});

module.exports = router;
