const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  const apiKey = 'AIzaSyCLJ_N6CML6qibWqLbzMaNMzZsY6AXY_LI';
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  try {
    const result = await model.generateContent('Olá, diga "Teste OK" se você estiver funcionando.');
    console.log('Resultado:', result.response.text());
  } catch (err) {
    console.error('Erro no Gemini:', err.message);
  }
}

test();
