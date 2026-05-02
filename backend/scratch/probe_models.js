const axios = require('axios');
const prisma = require('../src/lib/prisma');

async function listModels() {
  const settings = await prisma.tenantSettings.findFirst({
    where: { geminiKey: { not: null } }
  });

  if (!settings) {
    console.log('Nenhuma chave Gemini encontrada.');
    return;
  }

  const key = settings.geminiKey;
  console.log('Chave encontrada (fim):', key.slice(-5));

  try {
    const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    console.log('Modelos disponíveis:');
    response.data.models.forEach(m => {
      console.log(`- ${m.name} (${m.displayName})`);
    });
  } catch (err) {
    console.error('Erro ao listar via API:', err.response?.data || err.message);
  } finally {
    process.exit();
  }
}

listModels();
