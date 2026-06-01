const SerpApi = require('google-search-results-nodejs');

/**
 * Scraper de leads via Google Maps usando SerpAPI.
 * 250 buscas grátis por mês (sem Chromium/Puppeteer).
 * 
 * Cadastre-se em: https://serpapi.com
 * Coloque sua chave no campo SERPAPI_KEY nas configurações do tenant.
 * 
 * LOGS: Todos os logs usam o prefixo [scraper] para fácil filtro nos logs do Easypanel.
 */

/**
 * Busca leads no Google Maps via SerpAPI.
 * @param {string} query - Ex: "dentistas em São Paulo"
 * @param {string} apiKey - Chave da SerpAPI
 * @param {number} maxResults - Máx. de resultados (20 por página, máx ~60)
 * @returns {Promise<Array>} Lista de leads
 */
async function scrapeGoogleMaps(query, apiKey, maxResults = 20) {
  const startTime = Date.now();
  console.log('='.repeat(60));
  console.log(`[scraper] INÍCIO DA BUSCA (SerpAPI)`);
  console.log(`[scraper]   Query: "${query}"`);
  console.log(`[scraper]   Max resultados: ${maxResults}`);
  console.log(`[scraper]   Horário: ${new Date().toISOString()}`);

  if (!apiKey || apiKey.length < 10) {
    const msg = 'Chave da SerpAPI não configurada. Vá em Ajustes e preencha o campo "Chave SerpAPI".';
    console.error(`[scraper]   ✗ ${msg}`);
    throw new Error(msg);
  }

  const search = new SerpApi.GoogleSearch(apiKey);

  try {
    const allLeads = [];
    const pages = Math.ceil(maxResults / 20);

    for (let page = 0; page < pages; page++) {
      const start = page * 20;
      console.log(`[scraper]   Buscando página ${page + 1}/${pages} (start=${start})...`);

      const params = {
        engine: 'google_maps',
        q: query,
        type: 'search',
        start,
        hl: 'pt-br',
        gl: 'br',
      };

      const results = await new Promise((resolve, reject) => {
        search.json(params, (data) => {
          if (data?.error) {
            reject(new Error(data.error));
          } else {
            resolve(data);
          }
        });
      });

      // Verifica se retornou resultados
      const localResults = results?.local_results || [];
      console.log(`[scraper]   ✓ Página ${page + 1}: ${localResults.length} resultados`);

      if (localResults.length === 0) {
        console.log(`[scraper]   ℹ Sem mais resultados, parando paginação.`);
        break;
      }

      for (const item of localResults) {
        if (allLeads.length >= maxResults) break;

        allLeads.push({
          name: item.title || '',
          placeId: item.place_id || item.data_id || `serp_${Date.now()}_${allLeads.length}`,
          phone: item.phone || '',
          address: item.address || '',
          website: item.website || '',
          rating: item.rating || null,
          category: item.type || item.types?.[0] || '',
        });
      }

      // Se já tem o suficiente, para
      if (allLeads.length >= maxResults || localResults.length < 20) {
        break;
      }
    }

    // ========== RESUMO FINAL ==========
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const withPhone = allLeads.filter(l => l.phone).length;
    const withAddress = allLeads.filter(l => l.address).length;
    const withWebsite = allLeads.filter(l => l.website).length;

    console.log('='.repeat(60));
    console.log(`[scraper] BUSCA FINALIZADA COM SUCESSO`);
    console.log(`[scraper]   Query: "${query}"`);
    console.log(`[scraper]   Total de leads: ${allLeads.length}`);
    console.log(`[scraper]   Com telefone: ${withPhone} (${allLeads.length > 0 ? Math.round(withPhone / allLeads.length * 100) : 0}%)`);
    console.log(`[scraper]   Com endereço: ${withAddress}`);
    console.log(`[scraper]   Com website: ${withWebsite}`);
    console.log(`[scraper]   Tempo total: ${elapsed}s`);
    console.log('='.repeat(60));

    return allLeads;
  } catch (err) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error('='.repeat(60));
    console.error(`[scraper] BUSCA FALHOU após ${elapsed}s`);
    console.error(`[scraper]   Query: "${query}"`);
    console.error(`[scraper]   Erro: ${err.message}`);
    
    // Mensagens de erro amigáveis
    if (err.message.includes('Invalid API key')) {
      console.error(`[scraper]   SOLUÇÃO: Verifique se a chave da SerpAPI está correta nas configurações.`);
    } else if (err.message.includes('limit') || err.message.includes('exceeded')) {
      console.error(`[scraper]   SOLUÇÃO: Você atingiu o limite de 250 buscas/mês. Aguarde o próximo mês ou faça upgrade.`);
    }
    console.error('='.repeat(60));
    throw err;
  }
}

module.exports = { scrapeGoogleMaps };
