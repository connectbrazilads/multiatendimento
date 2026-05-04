const { GoogleGenerativeAI } = require('@google/generative-ai');

// Lista de modelos em ordem de preferência para fallback
const MODELS = ['gemini-2.5-flash', 'gemini-1.5-flash'];

async function getModel(apiKey, systemPrompt = null) {
  const genAI = new GoogleGenerativeAI(apiKey);
  return { genAI, systemPrompt };
}

async function chat(apiKey, systemPrompt, history, userMessage) {
  const { genAI } = await getModel(apiKey, systemPrompt);
  let lastError = null;

  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: systemPrompt });
      
      let combinedHistory = [];
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
      if (err.message.includes('503') || err.message.includes('404')) continue;
      throw err;
    }
  }
  throw lastError;
}

async function summarize(apiKey, systemPrompt, history, userMessage) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const historyText = history.map(m => `${m.fromMe || m.fromBot ? 'Agente' : 'Cliente'}: ${m.body}`).join('\n');
  const fullPrompt = `${systemPrompt}\n\nHistórico:\n${historyText}\n\nTarefa: ${userMessage}`;
  
  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(fullPrompt);
      return result.response.text();
    } catch (err) {
      console.warn(`[gemini] falha resumo com ${modelName}:`, err.message);
      if (err.message.includes('503') || err.message.includes('404')) continue;
      throw err;
    }
  }
}

async function transcribeAudio(apiKey, audioBase64, mimeType) {
  const genAI = new GoogleGenerativeAI(apiKey);
  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([{ inlineData: { data: audioBase64, mimeType } }, 'Transcreva este áudio.']);
      return result.response.text();
    } catch (err) {
      console.warn(`[gemini] falha transcrição com ${modelName}:`, err.message);
      if (err.message.includes('503') || err.message.includes('404')) continue;
      return null;
    }
  }
}

async function generateTags(apiKey, history, allowedTags = []) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const historyText = history.map(m => `${m.fromMe ? 'Agente' : 'Cliente'}: ${m.body}`).join('\n');
  let prompt = `Analise esta conversa e sugira até 3 tags curtas para categorizá-la.\n\n`;
  if (allowedTags.length > 0) {
    prompt += `VOCÊ DEVE ESCOLHER APENAS ENTRE ESTAS TAGS OFICIAIS: ${allowedTags.join(', ')}.\nSe nenhuma se aplicar, não retorne nada.\n`;
  } else {
    prompt += `Retorne apenas as tags separadas por vírgula.\n`;
  }
  prompt += `\nHistórico:\n${historyText}`;

  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const suggested = result.response.text().split(',').map(t => t.trim()).filter(t => t.length > 0);
      return allowedTags.length > 0 ? suggested.filter(t => allowedTags.includes(t)) : suggested;
    } catch (err) {
      console.warn(`[gemini] falha tags com ${modelName}:`, err.message);
      if (err.message.includes('503') || err.message.includes('404')) continue;
      return [];
    }
  }
}

async function generateTransferSummary(apiKey, history) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const historyText = history.slice(-30).map(m => `${m.fromMe || m.fromBot ? 'Atendimento' : 'Cliente'}: ${m.body}`).join('\n');
  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(`Gere um resumo curto desta conversa:\n${historyText}`);
      return result.response.text();
    } catch (err) {
      if (err.message.includes('503') || err.message.includes('404')) continue;
      return null;
    }
  }
}

async function getEmbedding(apiKey, text) {
  const genAI = new GoogleGenerativeAI(apiKey);
  // text-embedding-004 costuma ser mais estável para v1
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
  let dotProduct = 0, mA = 0, mB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    mA += vecA[i] * vecA[i];
    mB += vecB[i] * vecB[i];
  }
  mA = Math.sqrt(mA); mB = Math.sqrt(mB);
  const sim = dotProduct / (mA * mB);
  return isNaN(sim) ? 0 : sim;
}

async function analyzeImage(apiKey, imageBase64, mimeType, prompt = 'Descreva esta imagem.') {
  const genAI = new GoogleGenerativeAI(apiKey);
  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([{ inlineData: { data: imageBase64, mimeType } }, prompt]);
      return result.response.text();
    } catch (err) {
      if (err.message.includes('503') || err.message.includes('404')) continue;
      return null;
    }
  }
}

async function spellCheck(apiKey, text) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const prompt = `Você é um corretor ortográfico de português brasileiro para mensagens de atendimento ao cliente.
Analise o texto abaixo e corrija APENAS erros de ortografia/gramática, sem mudar o tom. Responda OK se estiver correto ou o texto corrigido se houver erros.\n\nTexto: "${text}"`;
  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const corrected = result.response.text().trim();
      return (corrected === 'OK' || corrected.toLowerCase() === 'ok' || corrected === text) ? null : corrected;
    } catch (err) {
      if (err.message.includes('503') || err.message.includes('404')) continue;
      return null;
    }
  }
}

async function extractClientInfo(apiKey, history, currentNotes) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const historyText = history.map(m => `${m.fromMe ? 'Agente' : 'Cliente'}: ${m.body}`).join('\n');
  const prompt = `Extraia informações técnicas do cliente desta conversa e atualize a ficha técnica consolidada. Responda IGNORAR se não houver nada novo.\n\nFicha Atual:\n${currentNotes}\n\nConversa:\n${historyText}`;
  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const resp = result.response.text().trim();
      return (resp === 'IGNORAR' || resp.toLowerCase() === 'ignorar') ? null : resp;
    } catch (err) {
      if (err.message.includes('503') || err.message.includes('404')) continue;
      return null;
    }
  }
}

async function draftServiceOrder(apiKey, history, equipments) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const historyText = history.slice(-20).map(m => `${m.fromMe ? 'Agente' : 'Cliente'}: ${m.body}`).join('\n');
  const equipList = equipments.map(e => `[ID: ${e.id}] ${e.model}`).join('\n');
  const prompt = `Gere um JSON rascunho de Ordem de Serviço: {"defect": "string", "equipmentId": "id ou null"}.\n\nEquipamentos:\n${equipList}\n\nConversa:\n${historyText}`;
  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      let text = result.response.text().trim();
      if (text.startsWith('```json')) text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(text);
    } catch (err) {
      if (err.message.includes('503') || err.message.includes('404')) continue;
      return { defect: null, equipmentId: null };
    }
  }
}

module.exports = { 
  chat, summarize, transcribeAudio, analyzeImage,
  generateTags, generateTransferSummary, getEmbedding, cosineSimilarity, spellCheck,
  extractClientInfo, draftServiceOrder
};
