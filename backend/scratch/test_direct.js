const axios = require('axios');

async function test() {
  const apiKey = 'AIzaSyCLJ_N6CML6qibWqLbzMaNMzZsY6AXY_LI';
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  try {
    const response = await axios.post(url, {
      contents: [{ parts: [{ text: 'ping' }] }]
    });
    console.log('V1 Success:', response.data);
  } catch (err) {
    console.log('V1 Error:', err.response ? err.response.data : err.message);
  }
}

test();
