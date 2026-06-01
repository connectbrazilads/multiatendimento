const puppeteer = require('puppeteer-core');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

/**
 * Scraper de leads via Google Maps usando Puppeteer-core.
 * Usa o Chromium do sistema (instalado pelo Nixpacks) em vez de baixar separado.
 * 
 * LOGS: Todos os logs usam o prefixo [scraper] para fácil filtro nos logs do Easypanel.
 */

const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--disable-gpu',
  '--window-size=1280,800',
  '--single-process',
];

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function logMemory(label) {
  const mem = process.memoryUsage();
  const sysMem = os.freemem();
  console.log(`[scraper] [MEM ${label}] RSS=${Math.round(mem.rss / 1024 / 1024)}MB | Heap=${Math.round(mem.heapUsed / 1024 / 1024)}MB | SistemaLivre=${Math.round(sysMem / 1024 / 1024)}MB`);
}

/**
 * Encontra o executável do Chromium no sistema.
 * Procura em: paths fixos comuns, nix store, e via 'which'.
 */
function findChromiumPath() {
  // 0. Variável de ambiente (definida no nixpacks.json)
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    console.log(`[scraper]   ✓ Chromium via ENV PUPPETEER_EXECUTABLE_PATH: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  // 1. Caminhos fixos conhecidos
  const knownPaths = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/snap/bin/chromium',
  ];
  
  for (const p of knownPaths) {
    if (fs.existsSync(p)) {
      console.log(`[scraper]   ✓ Chromium encontrado em path fixo: ${p}`);
      return p;
    }
  }

  // 2. Procura no Nix store (Nixpacks instala lá)
  try {
    const nixResult = execSync('find /nix/store -name "chromium" -type f -executable 2>/dev/null | head -1', { encoding: 'utf-8', timeout: 5000 }).trim();
    if (nixResult && fs.existsSync(nixResult)) {
      console.log(`[scraper]   ✓ Chromium encontrado no Nix store: ${nixResult}`);
      return nixResult;
    }
  } catch (e) { /* ok */ }

  // 3. Tenta via 'which'
  try {
    const whichResult = execSync('which chromium chromium-browser google-chrome 2>/dev/null | head -1', { encoding: 'utf-8', timeout: 3000 }).trim();
    if (whichResult && fs.existsSync(whichResult)) {
      console.log(`[scraper]   ✓ Chromium encontrado via which: ${whichResult}`);
      return whichResult;
    }
  } catch (e) { /* ok */ }

  // 4. Busca genérica por qualquer binário chromium
  try {
    const findResult = execSync('find / -name "chromium" -o -name "chromium-browser" -o -name "chrome" 2>/dev/null | grep -E "bin/" | head -1', { encoding: 'utf-8', timeout: 10000 }).trim();
    if (findResult && fs.existsSync(findResult)) {
      console.log(`[scraper]   ✓ Chromium encontrado via busca global: ${findResult}`);
      return findResult;
    }
  } catch (e) { /* ok */ }

  console.error('[scraper]   ✗ CHROMIUM NÃO ENCONTRADO no sistema!');
  console.error('[scraper]   Paths verificados:', knownPaths.join(', '));
  console.error('[scraper]   Verifique se o nixpacks.json inclui "chromium" nos apt packages.');
  return null;
}

async function scrapeGoogleMaps(query, maxResults = 30) {
  const startTime = Date.now();
  console.log('='.repeat(60));
  console.log(`[scraper] INÍCIO DA BUSCA`);
  console.log(`[scraper]   Query: "${query}"`);
  console.log(`[scraper]   Max resultados: ${maxResults}`);
  console.log(`[scraper]   Horário: ${new Date().toISOString()}`);
  console.log(`[scraper]   Node: ${process.version} | PID: ${process.pid}`);
  console.log(`[scraper]   OS: ${os.platform()} ${os.arch()} | RAM total: ${Math.round(os.totalmem() / 1024 / 1024)}MB`);
  logMemory('pré-launch');
  
  let browser;
  try {
    // ========== ETAPA 1: LAUNCH DO BROWSER ==========
    console.log('[scraper] [ETAPA 1/5] Iniciando navegador Chromium...');
    
    const launchOptions = {
      headless: 'new',
      args: BROWSER_ARGS,
      defaultViewport: { width: 1280, height: 800 },
      timeout: 30000,
      protocolTimeout: 60000,
    };

    // Encontra o Chromium do sistema
    const chromiumPath = findChromiumPath();
    
    if (chromiumPath) {
      launchOptions.executablePath = chromiumPath;
    } else {
      throw new Error(
        'Chromium não encontrado no sistema. ' +
        'Certifique-se de que "chromium" está listado no nixpacks.json. ' +
        'No ambiente local (Windows/Mac), instale o pacote "puppeteer" em vez de "puppeteer-core".'
      );
    }

    browser = await puppeteer.launch(launchOptions);
    const browserVersion = await browser.version();
    console.log(`[scraper]   ✓ Browser lançado com sucesso. Versão: ${browserVersion}`);
    logMemory('pós-launch');

    const page = await browser.newPage();
    
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Intercepta erros de console da página
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`[scraper] [BROWSER-ERROR] ${msg.text()}`);
      }
    });

    page.on('pageerror', err => {
      console.log(`[scraper] [PAGE-ERROR] ${err.message}`);
    });

    // ========== ETAPA 2: NAVEGAÇÃO ==========
    console.log('[scraper] [ETAPA 2/5] Navegando para Google Maps...');
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
    console.log(`[scraper]   URL: ${searchUrl}`);

    try {
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 45000 });
      console.log(`[scraper]   ✓ Página carregada com sucesso`);
    } catch (navErr) {
      console.error(`[scraper]   ✗ ERRO DE NAVEGAÇÃO: ${navErr.message}`);
      
      // Captura screenshot para debug
      try {
        const screenshotPath = `/tmp/scraper_error_${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.error(`[scraper]   Screenshot salvo em: ${screenshotPath}`);
      } catch (ssErr) {
        console.error(`[scraper]   Não foi possível salvar screenshot: ${ssErr.message}`);
      }
      throw navErr;
    }

    // Verifica se caiu em CAPTCHA
    const pageContent = await page.content();
    if (pageContent.includes('captcha') || pageContent.includes('unusual traffic') || pageContent.includes('não é um robô')) {
      console.error('[scraper]   ✗ CAPTCHA DETECTADO! O Google bloqueou a busca.');
      console.error('[scraper]   SOLUÇÃO: Aguarde algumas horas e tente novamente, ou reduza a frequência de buscas.');
      throw new Error('CAPTCHA detectado pelo Google. Tente novamente mais tarde.');
    }

    // Aceita cookies se aparecer
    try {
      const acceptBtn = await page.$('button[aria-label*="Accept"], button[aria-label*="Aceitar"], form[action*="consent"] button');
      if (acceptBtn) {
        console.log('[scraper]   ℹ Aceitando cookies...');
        await acceptBtn.click();
        await delay(2000);
      }
    } catch (e) { /* ok */ }

    await delay(3000);

    // Verifica se a lista de resultados existe
    const hasFeed = await page.$('div[role="feed"]');
    if (!hasFeed) {
      console.error('[scraper]   ✗ LISTA DE RESULTADOS NÃO ENCONTRADA');
      console.error('[scraper]   Possíveis causas: CAPTCHA, query sem resultados, ou Google mudou o layout');
      
      const pageTitle = await page.title();
      const currentUrl = page.url();
      console.error(`[scraper]   Título da página: "${pageTitle}"`);
      console.error(`[scraper]   URL atual: ${currentUrl}`);
      
      throw new Error('Lista de resultados do Google Maps não encontrada. Possível CAPTCHA ou query inválida.');
    }

    // ========== ETAPA 3: SCROLL E COLETA ==========
    console.log('[scraper] [ETAPA 3/5] Fazendo scroll para carregar resultados...');
    
    const scrollContainer = await page.$('div[role="feed"]');
    let totalLoaded = 0;

    if (scrollContainer) {
      let previousCount = 0;
      let scrollAttempts = 0;
      const maxScrolls = Math.ceil(maxResults / 7) + 3;

      while (scrollAttempts < maxScrolls) {
        await page.evaluate((el) => { el.scrollTop = el.scrollHeight; }, scrollContainer);
        await delay(1500);
        
        const currentCount = await page.evaluate(() => {
          return document.querySelectorAll('div[role="feed"] > div > div > a[href*="/maps/place/"]').length;
        });
        
        console.log(`[scraper]   Scroll ${scrollAttempts + 1}/${maxScrolls}: ${currentCount} resultados na página`);
        totalLoaded = currentCount;
        
        if (currentCount >= maxResults || currentCount === previousCount) {
          console.log(`[scraper]   ✓ Scroll finalizado (${currentCount === previousCount ? 'sem novos resultados' : 'máximo atingido'})`);
          break;
        }
        previousCount = currentCount;
        scrollAttempts++;
      }
    }

    // ========== ETAPA 4: EXTRAÇÃO DOS DADOS ==========
    console.log(`[scraper] [ETAPA 4/5] Extraindo dados de ${totalLoaded} resultados...`);

    const results = await page.evaluate((max) => {
      const items = document.querySelectorAll('div[role="feed"] > div > div > a[href*="/maps/place/"]');
      const leads = [];

      for (let i = 0; i < Math.min(items.length, max); i++) {
        const item = items[i];
        const container = item.closest('div[role="feed"] > div > div');
        if (!container) continue;

        const name = item.getAttribute('aria-label') || '';
        const href = item.getAttribute('href') || '';
        
        const placeIdMatch = href.match(/place\/[^/]+\/.*!1s([^!]+)/);
        const placeId = placeIdMatch ? placeIdMatch[1] : `scrape_${Date.now()}_${i}`;

        const allText = container.innerText || '';
        const lines = allText.split('\n').map(l => l.trim()).filter(Boolean);
        
        const ratingMatch = allText.match(/(\d[,\.]\d)\s*\(/);
        const rating = ratingMatch ? parseFloat(ratingMatch[1].replace(',', '.')) : null;
        
        let category = '';
        let address = '';
        let phone = '';

        for (const line of lines) {
          if (/^\(?\d{2}\)?\s*\d{4,5}[-\s]?\d{4}$/.test(line.replace(/\s/g, '').replace('+55', ''))) {
            phone = line;
            continue;
          }
          if (!category && line !== name && !line.match(/^\d/) && line.length < 40 && !line.includes('·') && !line.includes('R$')) {
            category = line;
          }
          if (!address && /(?:R\.|Av\.|Rua|Avenida|Trav|Rod|Estr|Al\.|Pç|Praça)/i.test(line)) {
            address = line;
          }
        }

        if (name) {
          leads.push({ name, placeId, rating, category, address, phone, website: '' });
        }
      }
      return leads;
    }, maxResults);

    console.log(`[scraper]   ✓ ${results.length} leads extraídos da lista`);
    
    if (results.length === 0) {
      console.warn('[scraper]   ⚠ ZERO RESULTADOS extraídos. A busca pode não ter retornado dados para essa query.');
      return [];
    }

    // ========== ETAPA 5: ENRIQUECIMENTO (detalhes individuais) ==========
    console.log(`[scraper] [ETAPA 5/5] Coletando detalhes de cada lead (telefone, site, endereço)...`);
    
    const enriched = [];
    const detailLimit = Math.min(results.length, maxResults);
    let phonesFound = 0;
    let websitesFound = 0;
    
    for (let i = 0; i < detailLimit; i++) {
      const result = results[i];
      
      try {
        const items = await page.$$('div[role="feed"] > div > div > a[href*="/maps/place/"]');
        if (items[i]) {
          await items[i].click();
          await delay(2500);

          const details = await page.evaluate(() => {
            const phone = document.querySelector('button[data-tooltip*="phone"], button[aria-label*="Telefone"], a[href^="tel:"]');
            const website = document.querySelector('a[data-tooltip*="website"], a[aria-label*="Website"], a[data-item-id="authority"]');
            const addressEl = document.querySelector('button[data-item-id="address"], button[aria-label*="Endereço"]');
            const categoryEl = document.querySelector('button[jsaction*="category"]');

            return {
              phone: phone?.innerText?.trim() || phone?.getAttribute('aria-label')?.replace(/.*:\s*/, '') || '',
              website: website?.getAttribute('href') || website?.innerText?.trim() || '',
              address: addressEl?.innerText?.trim() || addressEl?.getAttribute('aria-label')?.replace(/.*:\s*/, '') || '',
              category: categoryEl?.innerText?.trim() || '',
            };
          });

          if (details.phone) { result.phone = details.phone; phonesFound++; }
          if (details.website) { result.website = details.website; websitesFound++; }
          if (details.address) result.address = details.address;
          if (details.category) result.category = details.category;

          // Volta para a lista
          const backBtn = await page.$('button[aria-label="Voltar"], button[aria-label="Back"]');
          if (backBtn) {
            await backBtn.click();
            await delay(1000);
          }
        }
      } catch (err) {
        console.warn(`[scraper]   ⚠ Erro ao detalhar lead ${i + 1} ("${result.name}"): ${err.message}`);
      }

      enriched.push(result);
      
      if ((i + 1) % 5 === 0 || i === detailLimit - 1) {
        console.log(`[scraper]   Progresso: ${i + 1}/${detailLimit} | Telefones: ${phonesFound} | Sites: ${websitesFound}`);
      }
    }

    // ========== RESUMO FINAL ==========
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const withPhone = enriched.filter(l => l.phone).length;
    const withAddress = enriched.filter(l => l.address).length;
    const withWebsite = enriched.filter(l => l.website).length;

    console.log('='.repeat(60));
    console.log(`[scraper] BUSCA FINALIZADA COM SUCESSO`);
    console.log(`[scraper]   Query: "${query}"`);
    console.log(`[scraper]   Total de leads: ${enriched.length}`);
    console.log(`[scraper]   Com telefone: ${withPhone} (${enriched.length > 0 ? Math.round(withPhone / enriched.length * 100) : 0}%)`);
    console.log(`[scraper]   Com endereço: ${withAddress}`);
    console.log(`[scraper]   Com website: ${withWebsite}`);
    console.log(`[scraper]   Tempo total: ${elapsed}s`);
    logMemory('pós-scrape');
    console.log('='.repeat(60));

    return enriched;
  } catch (err) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error('='.repeat(60));
    console.error(`[scraper] BUSCA FALHOU após ${elapsed}s`);
    console.error(`[scraper]   Query: "${query}"`);
    console.error(`[scraper]   Erro: ${err.message}`);
    console.error(`[scraper]   Stack: ${err.stack?.split('\n').slice(0, 3).join(' | ')}`);
    logMemory('pós-erro');
    console.error('='.repeat(60));
    throw err;
  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log('[scraper] Browser encerrado com sucesso.');
      } catch (closeErr) {
        console.error(`[scraper] Erro ao fechar browser: ${closeErr.message}`);
      }
    }
  }
}

module.exports = { scrapeGoogleMaps };
