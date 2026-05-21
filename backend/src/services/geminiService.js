const { GoogleGenerativeAI } = require('@google/generative-ai');

// Separamos por perfil porque o backend usa IA para chat principal,
// resumo/rascunho estruturado e tarefas auxiliares mais baratas.
const DEFAULT_CHAT_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

const DEFAULT_LIGHT_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
];

const DEFAULT_MULTIMODAL_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

function getModels(envVarName, fallbackModels) {
  const envModels = process.env[envVarName]
    ?.split(',')
    .map((model) => model.trim())
    .filter(Boolean);

  return envModels?.length ? envModels : fallbackModels;
}

function shouldTryNextModel(err) {
  const message = err?.message || '';
  return message.includes('404') || message.includes('429') || message.includes('500') || message.includes('503');
}

async function getModel(apiKey, systemPrompt = null) {
  const genAI = new GoogleGenerativeAI(apiKey);
  return { genAI, systemPrompt };
}

async function chat(apiKey, systemPrompt, history, userMessage) {
  const { genAI } = await getModel(apiKey, systemPrompt);
  let lastError = null;

  for (const modelName of getModels('GEMINI_CHAT_MODELS', DEFAULT_CHAT_MODELS)) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: systemPrompt });

      const combinedHistory = [];
      history.forEach((m) => {
        const role = m.fromMe || m.fromBot ? 'model' : 'user';
        const last = combinedHistory[combinedHistory.length - 1];
        if (last && last.role === role) {
          last.parts[0].text += `\n${m.body}`;
        } else {
          combinedHistory.push({ role, parts: [{ text: m.body }] });
        }
      });

      while (combinedHistory.length > 0 && combinedHistory[0].role !== 'user') {
        combinedHistory.shift();
      }

      const chatSession = model.startChat({
        history: combinedHistory,
        generationConfig: { maxOutputTokens: 1000, temperature: 0.1, topK: 1 },
      });

      const result = await chatSession.sendMessage(userMessage);
      console.log(`[gemini] chat OK com ${modelName}`);
      return result.response.text();
    } catch (err) {
      console.warn(`[gemini] falha chat com ${modelName}:`, err.message);
      lastError = err;
      if (shouldTryNextModel(err)) continue;
      throw err;
    }
  }

  throw lastError;
}

async function summarize(apiKey, systemPrompt, history, userMessage) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const historyText = history.map((m) => `${m.fromMe || m.fromBot ? 'Agente' : 'Cliente'}: ${m.body}`).join('\n');
  const fullPrompt = `${systemPrompt}\n\nHistorico:\n${historyText}\n\nTarefa: ${userMessage}`;
  let lastError = null;

  for (const modelName of getModels('GEMINI_CHAT_MODELS', DEFAULT_CHAT_MODELS)) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(fullPrompt);
      return result.response.text();
    } catch (err) {
      console.warn(`[gemini] falha resumo com ${modelName}:`, err.message);
      lastError = err;
      if (shouldTryNextModel(err)) continue;
      throw err;
    }
  }

  throw lastError;
}

async function transcribeAudio(apiKey, audioBase64, mimeType) {
  const genAI = new GoogleGenerativeAI(apiKey);
  for (const modelName of getModels('GEMINI_MULTIMODAL_MODELS', DEFAULT_MULTIMODAL_MODELS)) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([{ inlineData: { data: audioBase64, mimeType } }, 'Transcreva este audio.']);
      return result.response.text();
    } catch (err) {
      console.warn(`[gemini] falha transcricao com ${modelName}:`, err.message);
      if (shouldTryNextModel(err)) continue;
      return null;
    }
  }

  return null;
}

async function generateTags(apiKey, history, allowedTags = []) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const historyText = history.map((m) => `${m.fromMe ? 'Agente' : 'Cliente'}: ${m.body}`).join('\n');
  let prompt = 'Analise esta conversa e sugira ate 3 tags curtas para categoriza-la.\n\n';

  if (allowedTags.length > 0) {
    prompt += `VOCE DEVE ESCOLHER APENAS ENTRE ESTAS TAGS OFICIAIS: ${allowedTags.join(', ')}.\nSe nenhuma se aplicar, nao retorne nada.\n`;
  } else {
    prompt += 'Retorne apenas as tags separadas por virgula.\n';
  }

  prompt += `\nHistorico:\n${historyText}`;

  for (const modelName of getModels('GEMINI_LIGHT_MODELS', DEFAULT_LIGHT_MODELS)) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const suggested = result.response.text().split(',').map((t) => t.trim()).filter((t) => t.length > 0);
      return allowedTags.length > 0 ? suggested.filter((t) => allowedTags.includes(t)) : suggested;
    } catch (err) {
      console.warn(`[gemini] falha tags com ${modelName}:`, err.message);
      if (shouldTryNextModel(err)) continue;
      return [];
    }
  }

  return [];
}

async function generateTransferSummary(apiKey, history) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const historyText = history.slice(-30).map((m) => `${m.fromMe || m.fromBot ? 'Atendimento' : 'Cliente'}: ${m.body}`).join('\n');

  for (const modelName of getModels('GEMINI_LIGHT_MODELS', DEFAULT_LIGHT_MODELS)) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(`Gere um resumo curto desta conversa:\n${historyText}`);
      return result.response.text();
    } catch (err) {
      if (shouldTryNextModel(err)) continue;
      return null;
    }
  }

  return null;
}

async function getEmbedding(apiKey, text) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const embedModels = ['text-embedding-004', 'embedding-001'];

  for (const modelName of embedModels) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (err) {
      console.warn(`[gemini] falha embedding com ${modelName}:`, err.message);
      continue;
    }
  }

  return null;
}

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB) return 0;

  let dotProduct = 0;
  let mA = 0;
  let mB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    mA += vecA[i] * vecA[i];
    mB += vecB[i] * vecB[i];
  }

  mA = Math.sqrt(mA);
  mB = Math.sqrt(mB);
  const sim = dotProduct / (mA * mB);
  return Number.isNaN(sim) ? 0 : sim;
}

async function analyzeImage(apiKey, imageBase64, mimeType, prompt = 'Descreva esta imagem.') {
  const genAI = new GoogleGenerativeAI(apiKey);

  for (const modelName of getModels('GEMINI_MULTIMODAL_MODELS', DEFAULT_MULTIMODAL_MODELS)) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([{ inlineData: { data: imageBase64, mimeType } }, prompt]);
      return result.response.text();
    } catch (err) {
      if (shouldTryNextModel(err)) continue;
      return null;
    }
  }

  return null;
}

async function extractClientInfo(apiKey, history, currentNotes) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const historyText = history.map((m) => `${m.fromMe ? 'Agente' : 'Cliente'}: ${m.body}`).join('\n');
  const prompt = `Extraia informacoes tecnicas do cliente desta conversa e atualize a ficha tecnica consolidada. Capture especialmente modelo de equipamento, marca, serie, serial, setor, ramal, endereco e identificadores curtos como "Xerox 7845" mesmo quando vierem em mensagens isoladas. Responda IGNORAR se nao houver nada novo.\n\nFicha Atual:\n${currentNotes}\n\nConversa:\n${historyText}`;

  for (const modelName of getModels('GEMINI_LIGHT_MODELS', DEFAULT_LIGHT_MODELS)) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const resp = result.response.text().trim();
      return resp === 'IGNORAR' || resp.toLowerCase() === 'ignorar' ? null : resp;
    } catch (err) {
      if (shouldTryNextModel(err)) continue;
      return null;
    }
  }

  return null;
}

async function draftServiceOrder(apiKey, history, equipments) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const historyText = history.slice(-20).map((m) => `${m.fromMe ? 'Agente' : 'Cliente'}: ${m.body}`).join('\n');
  const equipList = equipments.map((e) => `[ID: ${e.id}] ${e.model}`).join('\n');
  const prompt = `Gere um JSON rascunho de Ordem de Servico: {"defect": "string", "equipmentId": "id ou null"}.\n\nEquipamentos:\n${equipList}\n\nConversa:\n${historyText}`;

  for (const modelName of getModels('GEMINI_CHAT_MODELS', DEFAULT_CHAT_MODELS)) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      let text = result.response.text().trim();
      if (text.startsWith('```json')) text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(text);
    } catch (err) {
      if (shouldTryNextModel(err)) continue;
      return { defect: null, equipmentId: null };
    }
  }

  return { defect: null, equipmentId: null };
}

module.exports = {
  chat,
  summarize,
  transcribeAudio,
  analyzeImage,
  generateTags,
  generateTransferSummary,
  getEmbedding,
  cosineSimilarity,
  extractClientInfo,
  draftServiceOrder,
};
