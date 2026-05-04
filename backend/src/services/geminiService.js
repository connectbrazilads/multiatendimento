const { GoogleGenerativeAI } = require('@google/generative-ai');

async function chat(apiKey, systemPrompt, history, userMessage) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    systemInstruction: systemPrompt 
  }, { apiVersion: 'v1' });

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

  try {
    const chatSession = model.startChat({
      history: combinedHistory,
      generationConfig: { 
        maxOutputTokens: 1000,
        temperature: 0.1,
        topK: 1
      },
    });

    const result = await chatSession.sendMessage(userMessage);
    return result.response.text();
  } catch (err) {
    console.error('[gemini] erro no chat:', err.message);
    throw err;
  }
}

async function summarize(apiKey, systemPrompt, history, userMessage) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }, { apiVersion: 'v1' });
    const historyText = history.map(m => `${m.fromMe || m.fromBot ? 'Agente' : 'Cliente'}: ${m.body}`).join('\n');
    const fullPrompt = `${systemPrompt}\n\nHistórico:\n${historyText}\n\nTarefa: ${userMessage}`;
    const result = await model.generateContent(fullPrompt);
    return result.response.text();
  } catch (err) {
    console.error('[gemini] erro no resumo:', err.message);
    throw err;
  }
}

async function transcribeAudio(apiKey, audioBase64, mimeType) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }, { apiVersion: 'v1' });
    const result = await model.generateContent([{ inlineData: { data: audioBase64, mimeType } }, 'Transcreva este áudio.']);
    return result.response.text();
  } catch (err) {
    console.error('[gemini] erro na transcrição:', err.message);
    return null;
  }
}

async function generateTags(apiKey, history, allowedTags = []) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }, { apiVersion: 'v1' });
    const historyText = history.map(m => `${m.fromMe ? 'Agente' : 'Cliente'}: ${m.body}`).join('\n');
    
    let prompt = `Analise esta conversa e sugira até 3 tags curtas para categorizá-la.\n\n`;
    
    if (allowedTags.length > 0) {
      prompt += `VOCÊ DEVE ESCOLHER APENAS ENTRE ESTAS TAGS OFICIAIS: ${allowedTags.join(', ')}.\n`;
      prompt += `Se nenhuma se aplicar, não retorne nada.\n`;
    } else {
      prompt += `Retorne apenas as tags separadas por vírgula.\n`;
    }

    prompt += `\nHistórico:\n${historyText}`;
    
    const result = await model.generateContent(prompt);
    const tagsStr = result.response.text();
    
    const suggested = tagsStr.split(',').map(t => t.trim()).filter(t => t.length > 0);
    
    if (allowedTags.length > 0) {
      // Filtra para garantir que a IA obedeceu
      return suggested.filter(t => allowedTags.includes(t));
    }
    
    return suggested;
  } catch (err) {
    console.error('[gemini] erro ao gerar tags:', err.message);
    return [];
  }
}

async function generateTransferSummary(apiKey, history) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }, { apiVersion: 'v1' });
    const historyText = history.slice(-30).map(m => `${m.fromMe || m.fromBot ? 'Atendimento' : 'Cliente'}: ${m.body}`).join('\n');
    const result = await model.generateContent(`Gere um resumo curto desta conversa:\n${historyText}`);
    return result.response.text();
  } catch (err) {
    console.error('[gemini] erro no resumo de transferência:', err.message);
    return null;
  }
}

async function getEmbedding(apiKey, text) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'embedding-001' }, { apiVersion: 'v1' });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (err) {
    console.error('[gemini] erro no embedding:', err.message);
    return null;
  }
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
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }, { apiVersion: 'v1' });
    const result = await model.generateContent([{ inlineData: { data: imageBase64, mimeType } }, prompt]);
    return result.response.text();
  } catch (err) {
    console.error('[gemini] erro na análise de imagem:', err.message);
    return null;
  }
}

async function spellCheck(apiKey, text) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }, { apiVersion: 'v1' });
    
    const prompt = `Você é um corretor ortográfico de português brasileiro para mensagens de atendimento ao cliente.

Analise o texto abaixo e:
1. Corrija APENAS erros de ortografia, gramática e pontuação
2. Mantenha o tom e estilo original da mensagem
3. Não altere o conteúdo ou significado
4. Não adicione nem remova informações

Se o texto estiver correto, responda EXATAMENTE com: OK
Se houver erros, responda APENAS com o texto corrigido, sem explicações.

Texto: "${text}"`;
    
    const result = await model.generateContent(prompt);
    const corrected = result.response.text().trim();
    
    // Se a IA retornou OK ou o texto é igual, não há erros
    if (corrected === 'OK' || corrected.toLowerCase() === 'ok' || corrected === text) {
      return null;
    }
    
    return corrected;
  } catch (err) {
    console.error('[gemini] erro no spell check:', err.message);
    return null; // Em caso de erro, não bloqueia o envio
  }
}

async function extractClientInfo(apiKey, history, currentNotes) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }, { 
      apiVersion: 'v1',
      generationConfig: { temperature: 0.1 }
    });
    
    const historyText = history.map(m => `${m.fromMe ? 'Agente' : 'Cliente'}: ${m.body}`).join('\n');
    
    const prompt = `Você é um analista de dados. Sua tarefa é extrair informações permanentes do cliente desta conversa e atualizar as anotações existentes dele.

ANOTAÇÕES ATUAIS DO CLIENTE:
"""
${currentNotes || 'Nenhuma'}
"""

CONVERSA RECENTE:
"""
${historyText}
"""

INSTRUÇÕES:
1. Identifique se o cliente mencionou informações perenes relevantes, como:
   - Modelos de impressoras que ele possui ou aluga.
   - Tipos de suprimentos/cartuchos que ele usa.
   - Endereço, departamento, ou restrições técnicas.
2. Se houver informações novas, reescreva as "ANOTAÇÕES ATUAIS" mesclando com as novas informações de forma concisa e em tópicos.
3. Se não houver NENHUMA informação nova relevante na conversa recente, responda EXATAMENTE com a palavra: IGNORAR
4. Não inclua saudações, apenas a ficha técnica consolidada do cliente.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    
    if (responseText === 'IGNORAR' || responseText.toLowerCase() === 'ignorar') {
      return null;
    }
    
    return responseText;
  } catch (err) {
    console.error('[gemini] erro ao extrair infos do cliente:', err.message);
    return null;
  }
}

async function draftServiceOrder(apiKey, history, equipments) {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }, { 
      apiVersion: 'v1',
      generationConfig: { temperature: 0.1 }
    });
    
    const historyText = history.slice(-20).map(m => `${m.fromMe ? 'Agente' : 'Cliente'}: ${m.body}`).join('\n');
    const equipList = equipments.map(e => `[ID: ${e.id}] ${e.model} (Série: ${e.serialNumber || 'N/A'}) - Setor: ${e.sector || 'N/A'}`).join('\n');
    
    const prompt = `Você é um assistente técnico gerando um rascunho de Ordem de Serviço baseado em uma conversa de WhatsApp.

CONVERSA RECENTE:
"""
${historyText}
"""

EQUIPAMENTOS DO CLIENTE:
"""
${equipList || 'Nenhum equipamento cadastrado.'}
"""

INSTRUÇÕES:
1. Resuma o defeito ou solicitação reportada de forma técnica e direta no campo "defect".
2. Tente identificar qual equipamento da lista o cliente está se referindo. Se não conseguir ter certeza, deixe "equipmentId" vazio (null).
3. Responda ESTRITAMENTE num formato JSON válido:
{
  "defect": "string ou null",
  "equipmentId": "string do ID ou null"
}
`;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    if (text.startsWith('```json')) text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(text);
  } catch (err) {
    console.error('[gemini] erro ao rascunhar O.S.:', err.message);
    return { defect: null, equipmentId: null };
  }
}

module.exports = { 
  chat, summarize, transcribeAudio, analyzeImage,
  generateTags, generateTransferSummary, getEmbedding, cosineSimilarity, spellCheck,
  extractClientInfo, draftServiceOrder
};
