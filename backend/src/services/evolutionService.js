const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);

function getClient(url, key) {
  return axios.create({
    baseURL: url,
    headers: { apikey: key, 'Content-Type': 'application/json' },
  });
}

async function sendText(url, key, instanceName, phone, text, quoted = null) {
  const client = getClient(url, key);
  try {
    const payload = { number: phone, text };
    if (quoted) payload.quoted = { key: { id: quoted } };
    const { data } = await client.post(`/message/sendText/${instanceName}`, payload);
    console.log(`[evolutionService] sendText OK:`, data?.key?.id || 'id-não-retornado');
    return data;
  } catch (err) {
    console.error(`[evolutionService] sendText ERROR:`, err.response?.data || err.message);
    throw err;
  }
}

async function sendMedia(url, key, instanceName, phone, { mediatype, media, filename, caption, quoted }) {
  const client = getClient(url, key);
  const payload = {
    number: phone,
    mediatype,    // image | video | document
    media,        // base64
    fileName: filename || 'arquivo',
    caption: caption || '',
  };
  if (quoted) payload.quoted = { key: { id: quoted } };
  const { data } = await client.post(`/message/sendMedia/${instanceName}`, payload);
  return data;
}

async function sendAudio(url, key, instanceName, phone, audio, quoted = null) {
  const client = getClient(url, key);
  const payload = {
    number: phone,
    audio,        // base64
    encoding: true,
  };
  if (quoted) payload.quoted = { key: { id: quoted } };
  const { data } = await client.post(`/message/sendWhatsAppAudio/${instanceName}`, payload);
  return data;
}

async function getMediaBase64(url, key, instanceName, messageKey) {
  const client = getClient(url, key);
  const { data } = await client.post(`/chat/getBase64FromMediaMessage/${instanceName}`, {
    message: { key: messageKey },
  });
  return data; // { base64, mimetype, ... }
}

// Salva base64 como arquivo e retorna URL relativa
async function saveMediaFile(base64, mimetype, messageId) {
  const mainType = (mimetype || '').split(';')[0].trim();
  const isAudio = mainType.startsWith('audio/');
  const extMap = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
    'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/opus': 'ogg', 'audio/webm': 'webm',
    'application/pdf': 'pdf', 'video/mp4': 'mp4',
  };
  const ext = extMap[mainType] || (isAudio ? 'ogg' : 'bin');

  const dir = path.join(__dirname, '../../uploads/media');
  fs.mkdirSync(dir, { recursive: true });

  const rawFilename = `${messageId}.${ext}`;
  const rawPath = path.join(dir, rawFilename);
  fs.writeFileSync(rawPath, Buffer.from(base64, 'base64'));

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
      fs.unlinkSync(rawPath);
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

async function fetchProfilePicture(url, key, instanceName, phone) {
  try {
    const client = getClient(url, key);
    const { data } = await client.post(`/chat/fetchProfile/${instanceName}`, { number: phone });
    return data?.picture || data?.profilePictureUrl || null;
  } catch {
    return null;
  }
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

module.exports = {
  sendText, sendMedia, sendAudio, getMediaBase64, saveMediaFile,
  getQrCode, getConnectionState, setWebhook, createInstance, fetchInstanceInfo, fetchProfilePicture, revokeMessage
};
