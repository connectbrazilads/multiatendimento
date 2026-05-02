const { GoogleGenerativeAI } = require('@google/generative-ai');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const settings = await prisma.tenantSettings.findFirst({ where: { NOT: { geminiKey: null } } });
  if (!settings) {
    console.log('Nenhuma chave Gemini encontrada no banco.');
    process.exit(0);
  }

  console.log('Testando chave:', settings.geminiKey.substring(0, 10) + '...');
  
  try {
    console.log('--- TESTANDO v1 REAL ---');
    const genAI = new GoogleGenerativeAI(settings.geminiKey);
    // FORÇANDO v1 NO SEGUNDO PARÂMETRO
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: 'v1' });
    const result = await model.generateContent("Oi");
    console.log('V1_SUCCESS:', result.response.text());
  } catch (err) {
    console.log('V1_ERROR:', err.message);
  }

  process.exit(0);
}

check();
