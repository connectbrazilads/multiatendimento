const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);

function sanitizeUrl(url) {
  let baseUrl = String(url || '').trim();
  if (!baseUrl || baseUrl === 'undefined' || baseUrl === 'null') {
    throw new Error('Evolution API URL não configurada ou inválida');
  }
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `https://${baseUrl}`;
  }
  return baseUrl.replace(/\/+$/, '');
}

function getClient(url, key) {
  const baseUrl = sanitizeUrl(url);
  return axios.create({
    baseURL: baseUrl,
    headers: { apikey: key, 'Content-Type': 'application/json' },
    maxContentLength: 100 * 1024 * 1024, // 100MB
    maxBodyLength: 100 * 1024 * 1024,    // 100MB
    timeout: 60000 // 60 segundos
  });
}

function buildQuotedPayload(quoted) {
  if (!quoted) return undefined;
  return { key: { id: quoted } };
}

function getMessageKeyId(data) {
  return data?.key?.id || data?.message?.key?.id || null;
}

function ensureAccepted(data, context) {
  const messageId = getMessageKeyId(data);
  if (messageId) return data;

  const status = typeof data?.status === 'string' ? data.status : 'sem-status';
  const preview = JSON.stringify(data || {}).slice(0, 500);
  throw new Error(`${context} sem confirmação da Evolution (status=${status}). Resposta: ${preview}`);
}

async function sendText(url, key, instanceName, phone, text, quoted = null) {
  const client = getClient(url, key);
  try {
    const payload = { number: phone, text };
    if (quoted) payload.quoted = buildQuotedPayload(quoted);
    const { data } = await client.post(`/message/sendText/${instanceName}`, payload);
    console.log(`[evolutionService] sendText OK:`, data?.key?.id || 'id-não-retornado');
    return ensureAccepted(data, 'sendText');
  } catch (err) {
    console.error(`[evolutionService] sendText ERROR:`, err.response?.data || err.message);
    throw err;
  }
}

async function sendMediaMultipart(url, key, instanceName, phone, { mediatype, mimetype, filename, caption, quoted, filePath }) {
  const endpointBase = sanitizeUrl(url);
  const form = new FormData();
  form.append('number', phone);
  form.append('mediatype', mediatype);
  form.append('mimetype', mimetype);
  form.append('caption', caption || '');
  form.append('fileName', filename || path.basename(filePath) || 'arquivo');
  form.append('media', fs.createReadStream(filePath));

  if (quoted) {
    form.append('quoted', JSON.stringify(buildQuotedPayload(quoted)));
  }

  const { data } = await axios.post(`${endpointBase}/message/sendMedia/${instanceName}`, form, {
    headers: {
      apikey: key,
      ...form.getHeaders()
    },
    maxContentLength: 100 * 1024 * 1024,
    maxBodyLength: 100 * 1024 * 1024,
    timeout: 60000
  });

  console.log(`[evolutionService] sendMedia multipart OK:`, getMessageKeyId(data) || 'id-nÃ£o-retornado');
  return ensureAccepted(data, 'sendMedia multipart');
}

async function sendMediaJson(url, key, instanceName, phone, { mediatype, media, mimetype, filename, caption, quoted }) {
  const client = getClient(url, key);
  const payload = {
    number: phone,
    mediatype,
    mimetype,
    media,
    fileName: filename || 'arquivo',
    caption: caption || ''
  };
  if (quoted) payload.quoted = buildQuotedPayload(quoted);
  const { data } = await client.post(`/message/sendMedia/${instanceName}`, payload);
  console.log(`[evolutionService] sendMedia json OK:`, getMessageKeyId(data) || 'id-nÃ£o-retornado');
  return ensureAccepted(data, 'sendMedia json');
}

async function sendMedia(url, key, instanceName, phone, { mediatype, media, mimetype, filename, caption, quoted, filePath }) {
  if (filePath && fs.existsSync(filePath)) {
    try {
      return await sendMediaMultipart(url, key, instanceName, phone, {
        mediatype,
        mimetype,
        filename,
        caption,
        quoted,
        filePath
      });
    } catch (err) {
      console.warn('[evolutionService] sendMedia multipart falhou, tentando JSON/base64...', err.response?.data || err.message);
    }
  }

  return sendMediaJson(url, key, instanceName, phone, {
    mediatype,
    media,
    mimetype,
    filename,
    caption,
    quoted
  });
}

async function sendAudio(url, key, instanceName, phone, audio, quoted = null) {
  const client = getClient(url, key);
  const payload = {
    number: phone,
    audio,        // base64
    encoding: true,
  };
  if (quoted) payload.quoted = buildQuotedPayload(quoted);
  const { data } = await client.post(`/message/sendWhatsAppAudio/${instanceName}`, payload);
  console.log(`[evolutionService] sendAudio OK:`, getMessageKeyId(data) || 'id-nÃ£o-retornado');
  return ensureAccepted(data, 'sendAudio');
}

// Função de compatibilidade para evitar erros de "not a function" em códigos legados
async function sendMessage(url, key, instanceName, phone, body, quoted = null) {
  console.warn('[evolutionService] sendMessage (legado) chamado. Redirecionando para sendText.');
  return sendText(url, key, instanceName, phone, body, quoted);
}

async function getMediaBase64(url, key, instanceName, messageKey) {
  const client = getClient(url, key);
  
  // Lista de tentativas em ordem de probabilidade para Evolution v2
  const attempts = [
    { url: `/chat/getBase64FromMediaMessage/${instanceName}`, payload: { message: { key: messageKey } } },
    { url: `/chat/getBase64FromMediaMessage/${instanceName}`, payload: { key: messageKey } },
    { url: `/chat/getBase64FromMessage/${instanceName}`, payload: { message: { key: messageKey } } },
    { url: `/chat/getBase64FromMessage/${instanceName}`, payload: { key: messageKey } },
  ];

  for (const attempt of attempts) {
    try {
      const { data } = await client.post(attempt.url, attempt.payload);
      // Se retornou algo que pareça um base64, sucesso
      const base64 = data?.base64 || data?.data?.base64 || data?.data?.data?.base64;
      if (base64) return data;
    } catch (err) {
      // Se for 401 ou 403, nem tenta os outros
      if (err.response?.status === 401 || err.response?.status === 403) throw err;
      continue;
    }
  }

  throw new Error('Não foi possível obter o Base64 da mídia em nenhum endpoint conhecido.');
}

// Salva base64 como arquivo e retorna URL relativa
async function saveMediaFile(base64, mimetype, messageId) {
  const mainType = (mimetype || '').split(';')[0].trim();
  const isAudio = mainType.startsWith('audio/');
  const extMap = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
    'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/opus': 'ogg', 'audio/webm': 'webm',
    'application/pdf': 'pdf', 
    'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/3gpp': '3gp', 'video/webm': 'webm', 'video/x-matroska': 'mkv',
  };
  const ext = extMap[mainType] || (isAudio ? 'ogg' : 'bin');

  const dir = path.resolve(__dirname, '..', '..', 'uploads', 'media');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const rawFilename = `${messageId}.${ext}`;
  const rawPath = path.join(dir, rawFilename);
  await fs.promises.writeFile(rawPath, Buffer.from(base64, 'base64'));

  // Converte áudio (WhatsApp PTT OGG/Opus) para MP3 para playback correto no browser
  if (isAudio) {
    const mp3Filename = `${messageId}.mp3`;
    const mp3Path = path.join(dir, mp3Filename);
    console.log(`[audio] mimetype="${mimetype}" ext="${ext}"`);
    // Roda ffprobe para ver o sample rate real do OGG antes de converter
    await new Promise(resolve => ffmpeg.ffprobe(rawPath, (err, data) => {
      if (data?.streams?.[0]) {
        const st = data.streams[0];
        console.log(`[audio] ffprobe: codec=${st.codec_name} sample_rate=${st.sample_rate} channels=${st.channels} duration=${st.duration} bit_rate=${st.bit_rate}`);
      } else if (err) {
        console.log('[audio] ffprobe erro:', err.message);
      }
      resolve();
    }));
    console.log(`[audio] convertendo ${rawPath} → ${mp3Path}`);
    try {
      await new Promise((resolve, reject) =>
        ffmpeg(rawPath)
          .inputOptions(['-analyzeduration', '10M', '-probesize', '10M'])
          .noVideo()
          .audioCodec('libmp3lame')
          .audioFrequency(44100)
          .audioChannels(1)
          .audioBitrate('128k')
          .toFormat('mp3')
          .on('start', cmd => console.log('[audio] cmd:', cmd))
          .on('end', () => { console.log('[audio] conversão OK'); resolve(); })
          .on('error', err => { console.error('[audio] FFmpeg erro:', err.message); reject(err); })
          .save(mp3Path)
      );
      await fs.promises.unlink(rawPath);
      return `/uploads/media/${mp3Filename}`;
    } catch (err) {
      console.error('[audio] falhou, usando arquivo original:', err.message);
    }
  }

  return `/uploads/media/${rawFilename}`;
}

async function getQrCode(url, key, instanceName) {
  const client = getClient(url, key);
  const { data } = await client.get(`/instance/connect/${instanceName}`);
  return data;
}

async function getConnectionState(url, key, instanceName) {
  const client = getClient(url, key);
  const { data } = await client.get(`/instance/connectionState/${instanceName}`);
  return data;
}

async function setWebhook(url, key, instanceName, webhookUrl) {
  const client = getClient(url, key);
  const { data } = await client.post(`/webhook/set/${instanceName}`, {
    webhook: {
      url: webhookUrl,
      enabled: true,
      webhook_by_events: false,
      webhook_base64: false,
      events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'MESSAGES_DELETE', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'],
    },
  });
  return data;
}

async function createInstance(url, key, instanceName) {
  const client = getClient(url, key);
  const { data } = await client.post('/instance/create', {
    instanceName,
    qrcode: true,
    integration: 'WHATSAPP-BAILEYS',
  });
  return data;
}

function normalizePhoneNumber(phone) {
  if (typeof phone !== 'string' && typeof phone !== 'number') return '';
  let digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  if (digits.startsWith('550')) {
    digits = `55${digits.slice(3)}`;
  }

  if (!digits.startsWith('55')) {
    if (digits.startsWith('0') && digits.length >= 11) {
      digits = digits.slice(1);
    }

    if (digits.length <= 11) {
      digits = `55${digits}`;
    }
  }

  return digits;
}

function buildPhoneLookupCandidates(phone) {
  const rawDigits = typeof phone === 'string' || typeof phone === 'number'
    ? String(phone).replace(/\D/g, '')
    : '';

  if (!rawDigits) return [];

  const candidates = new Set([rawDigits]);
  const normalized = normalizePhoneNumber(rawDigits);
  if (normalized) {
    candidates.add(normalized);
  }

  if (rawDigits.startsWith('00')) {
    candidates.add(rawDigits.slice(2));
  }

  if (normalized.startsWith('55')) {
    const localDigits = normalized.slice(2);
    candidates.add(localDigits);
    candidates.add(`0${localDigits}`);
    candidates.add(`550${localDigits}`);
  }

  return Array.from(candidates).filter(Boolean);
}

function extractProfilePictureUrl(payload) {
  if (!payload) return null;
  if (typeof payload === 'string' && payload.startsWith('http')) return payload;

  const candidates = [
    payload.profilePictureUrl,
    payload.picture,
    payload.pictureUrl,
    payload.profilePicUrl,
    payload.profile_pic_url,
    payload.data?.profilePictureUrl,
    payload.data?.picture,
    payload.response?.profilePictureUrl,
    payload.response?.picture,
  ];

  return candidates.find((value) => typeof value === 'string' && value.startsWith('http')) || null;
}

async function fetchProfilePicture(url, key, instanceName, phone) {
  const normalizedPhone = normalizePhoneNumber(phone);
  if (!normalizedPhone) return null;

  try {
    const client = getClient(url, key);
    const endpoints = [
      `/chat/fetchProfilePictureUrl/${instanceName}`,
      `/chat/fetchProfile/${instanceName}`,
    ];

    for (const endpoint of endpoints) {
      try {
        const { data } = await client.post(endpoint, { number: normalizedPhone });
        const picture = extractProfilePictureUrl(data);
        if (picture) return picture;
      } catch {
        // Tenta o proximo endpoint compativel.
      }
    }
  } catch {
    return null;
  }

  return null;
}

async function fetchInstanceInfo(url, key, instanceName) {
  const client = getClient(url, key);
  try {
    const { data } = await client.get(`/instance/fetchInstances?instanceName=${instanceName}`);
    return Array.isArray(data) ? data[0] : data;
  } catch {
    return null;
  }
}

async function revokeMessage(url, key, instanceName, remoteJid, messageId) {
  const client = getClient(url, key);
  const jid = remoteJid.includes('@') ? remoteJid : `${remoteJid}@s.whatsapp.net`;
  
  // Tenta deleteMessage (mais moderno) ou revokeMessage (legado)
  try {
    const { data } = await client.post(`/message/deleteMessage/${instanceName}`, {
      number: jid,
      id: messageId,
      fromMe: true
    });
    return data;
  } catch (err) {
    console.log('[evolutionService] deleteMessage falhou, tentando revokeMessage...');
    const { data } = await client.post(`/chat/revokeMessage/${instanceName}`, {
      message: {
        key: {
          remoteJid: jid,
          id: messageId,
          fromMe: true
        }
      }
    });
    return data;
  }
}

module.exports = {
  sendText, sendMedia, sendAudio, sendMessage, getMediaBase64, saveMediaFile,
  getQrCode, getConnectionState, setWebhook, createInstance, fetchInstanceInfo, fetchProfilePicture, revokeMessage,
  normalizePhoneNumber, buildPhoneLookupCandidates
};
