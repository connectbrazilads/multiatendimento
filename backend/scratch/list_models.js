const { GoogleGenerativeAI } = require('@google/generative-ai');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');

async function check() {
  const settings = await prisma.tenantSettings.findFirst({ where: { NOT: { geminiKey: null } } });
  if (!settings) process.exit(0);

  const key = settings.geminiKey;
  console.log('Listando modelos para a chave...');
  
  try {
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${key}`;
    const res = await axios.get(url);
    console.log('MODELOS_DISPONIVEIS:');
    res.data.models.forEach(m => {
        console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`);
    });
  } catch (err) {
    console.log('ERRO_LISTAR:', err.response?.data || err.message);
  }

  process.exit(0);
}

check();
