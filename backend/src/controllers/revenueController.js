const prisma = require('../lib/prisma');
const crmController = require('./crmController');

async function getRevenueDashboard(req, res) {
  const tenantId = req.user.tenantId;

  try {
    const settings = await prisma.tenantSettings.findUnique({ where: { tenantId } });
    const kpiSlaLimitHours = settings?.kpiSlaLimitHours ?? 24;
    const slaLimitDate = new Date(Date.now() - kpiSlaLimitHours * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // ───────────────────────────────────────────────────────────────
    // 1. CARREGAR TODAS AS O.S. REAIS DO iLux (Firebird) 
    //    Fonte: ExternalSyncRecord com entity = 'serviceOrders'
    // ───────────────────────────────────────────────────────────────
    const allFirebirdOS = await prisma.externalSyncRecord.findMany({
      where: { tenantId, source: 'firebird', entity: 'serviceOrders' },
      select: { externalId: true, payload: true, receivedAt: true },
    });

    function fbStatus(payload) {
      const raw = payload?.raw || payload || {};
      const status = String(raw.status || raw.nmstatus || payload?.status || '').trim().toUpperCase();
      const closedAt = raw.dtfechamento || payload?.closedAt;
      if (closedAt || ['O', 'F', 'C', 'FINALIZADA', 'CONCLUIDA'].includes(status)) return 'FINALIZADA';
      if (status.includes('AGUARD')) return 'AGUARDANDO_RETORNO';
      if (status.includes('ATEND') || ['E', 'M', 'T'].includes(status)) return 'EM_ATENDIMENTO';
      return 'PENDENTE';
    }

    function fbDate(payload, ...keys) {
      const raw = payload?.raw || payload || {};
      for (const key of keys) {
        const val = raw[key] || raw[key.toLowerCase()] || raw[key.toUpperCase()] || payload?.[key];
        if (val) { const d = new Date(val); if (!Number.isNaN(d.getTime())) return d; }
      }
      return null;
    }

    const classified = allFirebirdOS.map(r => {
      const p = r.payload || {};
      const status = fbStatus(p);
      const openedAt = fbDate(p, 'dtinclusao', 'createdAt', 'updatedAt');
      const closedAt = fbDate(p, 'dtfechamento', 'closedAt');
      const raw = p.raw || p;
      return {
        externalId: r.externalId,
        payload: p,
        status,
        openedAt,
        closedAt,
        clientExternalId: String(raw.cdcliente || p.clientExternalId || ''),
        clientName: String(raw.nmcliente || p.clientName || ''),
        technician: raw.nmsuportet || raw.nmsuportel || p.technician || '',
        equipmentId: String(raw.cdequipamento || p.equipmentExternalId || ''),
      };
    });

    // Calcular o Tempo Médio em Aberto (em horas) para O.S. ativas
    const activeOS = classified.filter(o => o.status === 'PENDENTE' || o.status === 'EM_ATENDIMENTO');
    let totalOpenHours = 0;
    let activeOSCount = 0;
    const now = Date.now();
    for (const o of activeOS) {
      if (o.openedAt) {
        totalOpenHours += (now - o.openedAt.getTime()) / (1000 * 60 * 60);
        activeOSCount++;
      }
    }
    const averageOpenTimeHours = activeOSCount > 0 ? totalOpenHours / activeOSCount : 0;


    // ───────────────────────────────────────────────────────────────
    // 2. FUNIL DE ATENDIMENTO (dados reais do iLux)
    // ───────────────────────────────────────────────────────────────
    const pendentes = classified.filter(o => o.status === 'PENDENTE');
    const emAtendimento = classified.filter(o => o.status === 'EM_ATENDIMENTO');
    const aguardando = classified.filter(o => o.status === 'AGUARDANDO_RETORNO');
    const finalizadas30d = classified.filter(o => o.status === 'FINALIZADA' && o.closedAt && o.closedAt >= thirtyDaysAgo);

    // ───────────────────────────────────────────────────────────────
    // 3. MRR EM RISCO — O.S. abertas que quebraram SLA
    // ───────────────────────────────────────────────────────────────
    const criticalOS = classified.filter(o =>
      (o.status === 'PENDENTE' || o.status === 'EM_ATENDIMENTO') &&
      o.openedAt && o.openedAt <= slaLimitDate
    );
    const uniqueClientsAtRisk = [...new Set(criticalOS.map(o => o.clientExternalId).filter(Boolean))];

    let mrrInRisk = 0;
    const mrrRiskBands = { band1to3: 0, band3to7: 0, bandOver7: 0 };
    let clientsAtRiskList = [];

    for (const clientExtId of uniqueClientsAtRisk) {
      try {
        const contracts = await crmController.loadContracts(tenantId, clientExtId);
        const activeContracts = contracts.filter(c => c.isActive);
        if (activeContracts.length > 0) {
          const clientMRR = activeContracts.reduce((sum, c) => sum + (c.monthlyValue || 0), 0);
          mrrInRisk += clientMRR;

          // Encontrar a O.S. mais antiga pendente deste cliente
          const clientOSs = criticalOS.filter(o => o.clientExternalId === clientExtId);
          clientOSs.sort((a, b) => a.openedAt.getTime() - b.openedAt.getTime());
          const oldestOS = clientOSs[0];
          const daysLate = (Date.now() - oldestOS.openedAt.getTime()) / (1000 * 60 * 60 * 24);

          // Agrupar nas faixas
          if (daysLate <= 3) mrrRiskBands.band1to3 += clientMRR;
          else if (daysLate <= 7) mrrRiskBands.band3to7 += clientMRR;
          else mrrRiskBands.bandOver7 += clientMRR;

          clientsAtRiskList.push({
            clientExternalId: clientExtId,
            clientName: oldestOS.clientName || `Cliente #${clientExtId}`,
            mrr: clientMRR,
            daysLate: daysLate,
            oldestOSExternalId: oldestOS.externalId
          });
        }
      } catch (_err) { /* ignora erro individual */ }
    }

    // Ordenar ranking pelos de maior MRR
    clientsAtRiskList.sort((a, b) => b.mrr - a.mrr);
    const rankingClientsAtRisk = clientsAtRiskList.slice(0, 10);


    // ───────────────────────────────────────────────────────────────
    // 4. GARGALOS CRÍTICOS (dados reais do Firebird)
    // ───────────────────────────────────────────────────────────────
    const noTechnicianCount = pendentes.filter(o => !o.technician).length;

    const equipmentCounts = {};
    for (const o of classified) {
      if (o.openedAt && o.openedAt >= thirtyDaysAgo && o.equipmentId) {
        equipmentCounts[o.equipmentId] = (equipmentCounts[o.equipmentId] || 0) + 1;
      }
    }
    const reincidentEquipmentsCount = Object.values(equipmentCounts).filter(c => c > 2).length;

    const badCsatCount = await prisma.ticket.count({
      where: { tenantId, rating: { not: null, lte: 2 }, resolvedAt: { gte: thirtyDaysAgo } }
    });

    // ───────────────────────────────────────────────────────────────
    // RESPOSTA
    // ───────────────────────────────────────────────────────────────
    // ───────────────────────────────────────────────────────────────
    // VAZAMENTO DO FUNIL (Perda)
    // ───────────────────────────────────────────────────────────────
    const vazamento = aguardando.filter(o => o.openedAt && o.openedAt < thirtyDaysAgo);
    const vazamentoMes = vazamento.length;
    let vazamentoValor = 0;
    
    // Tenta somar valores dos orçamentos, ou fallback para uma estimativa se não houver
    for (const o of vazamento) {
      if (o.payload && o.payload.totalValue) {
        vazamentoValor += parseFloat(o.payload.totalValue) || 0;
      }
    }

    res.json({
      receitaEmRiscoHoje: mrrInRisk,
      mrrInRisk,
      mrrRiskBands,
      averageOpenTimeHours,
      rankingClientsAtRisk,
      stalledEstimates: 0,
      stalledEstimatesCount: aguardando.length,
      kpis: { kpiSlaLimitHours },
      causas: [
        { id: '1', descricao: 'Chamados pendentes sem técnico designado', quantidade: noTechnicianCount, prioridade: 'alta' },
        { id: '2', descricao: 'Orçamentos de peças/serviço aguardando aprovação', quantidade: aguardando.length, prioridade: 'media' },
        { id: '3', descricao: 'Equipamentos reincidentes com falhas recorrentes (> 2 OS/mês)', quantidade: reincidentEquipmentsCount, prioridade: 'alta' },
        { id: '4', descricao: 'Chamados com avaliações ruins dos clientes (CSAT ≤ 2)', quantidade: badCsatCount, prioridade: 'alta' }
      ],
      funnel: {
        novosChamados: pendentes.length,
        emAtendimento: emAtendimento.length,
        aguardandoCliente: aguardando.length,
        finalizadosMes: finalizadas30d.length,
        vazamentoMes,
        vazamentoValor
      }
    });
  } catch (error) {
    console.error('[revenueController] Erro ao obter dados de receita:', error);
    res.status(500).json({ error: 'Erro interno ao processar indicadores de receita.' });
  }
}

async function getBenchmark(req, res) {
  const tenantId = req.user.tenantId;
  try {
    const rawRecords = await prisma.externalSyncRecord.findMany({
      where: { tenantId, entity: 'serviceOrders' }
    });

    const tickets = await prisma.ticket.findMany({
      where: { tenantId, rating: { not: null } },
      select: { id: true, contactId: true, agentId: true, rating: true, contact: { select: { externalId: true } } }
    });

    function fbStatus(payload) {
      if (!payload) return 'DESCONHECIDO';
      const statusStr = (payload.status || payload.SITUACAO || '').toString().toUpperCase();
      if (statusStr.includes('PENDENTE') || statusStr === '1' || statusStr === 'ABERTO') return 'PENDENTE';
      if (statusStr.includes('ATENDIMENTO') || statusStr === '2') return 'EM_ATENDIMENTO';
      if (statusStr.includes('ORÇAMENTO') || statusStr.includes('ORCAMENTO') || statusStr === '3') return 'AGUARDANDO_APROVACAO';
      if (statusStr.includes('FINALIZADA') || statusStr.includes('CONCLUÍDO') || statusStr === '4') return 'FINALIZADA';
      if (statusStr.includes('CANCELADA') || statusStr === '5') return 'CANCELADA';
      return 'DESCONHECIDO';
    }

    function fbDate(val) {
      if (!val) return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    }

    const classified = rawRecords.map(r => {
      const p = r.payload || {};
      const status = fbStatus(p);
      return {
        externalId: r.externalId,
        clientExternalId: p.clientExternalId || p.CODIGO_CLIENTE?.toString(),
        clientName: p.clientName || p.NOME_CLIENTE || 'Cliente Desconhecido',
        technicianName: p.technicianName || p.NOME_TECNICO || 'Sem Técnico',
        status,
        openedAt: fbDate(p.openedAt || p.DATA_ABERTURA),
        closedAt: fbDate(p.closedAt || p.DATA_FECHAMENTO)
      };
    }).filter(o => o.openedAt);

    // Agrupar por Cliente
    const clientMap = {};
    for (const o of classified) {
      if (!o.clientName) continue;
      if (!clientMap[o.clientName]) {
        clientMap[o.clientName] = { nome: o.clientName, osCount: 0, finalizadas: [], clientExternalId: o.clientExternalId };
      }
      clientMap[o.clientName].osCount++;
      if (o.status === 'FINALIZADA' && o.closedAt) {
        clientMap[o.clientName].finalizadas.push(o);
      }
    }

    const clientBenchmark = Object.values(clientMap).map(c => {
      let avgSla = null;
      if (c.finalizadas.length > 0) {
        const totalSla = c.finalizadas.reduce((sum, so) => {
          const diffMs = so.closedAt.getTime() - so.openedAt.getTime();
          return sum + (diffMs / (1000 * 60 * 60)); // horas
        }, 0);
        avgSla = Math.round((totalSla / c.finalizadas.length) * 10) / 10;
      }
      
      // CSAT
      const clientTickets = tickets.filter(t => t.contact?.externalId === c.clientExternalId);
      let avgCsat = null;
      if (clientTickets.length > 0) {
        const totalCsat = clientTickets.reduce((sum, t) => sum + t.rating, 0);
        avgCsat = Math.round((totalCsat / clientTickets.length) * 10) / 10;
      }

      return {
        id: c.clientExternalId || c.nome,
        nome: c.nome,
        osCount: c.osCount,
        avgSla,
        avgCsat
      };
    }).sort((a, b) => b.osCount - a.osCount).slice(0, 10);

    // Agrupar por Atendente
    const agentMap = {};
    for (const o of classified) {
      if (!o.technicianName || o.technicianName === 'Sem Técnico') continue;
      if (!agentMap[o.technicianName]) {
        agentMap[o.technicianName] = { nome: o.technicianName, osCount: 0, finalizadas: [] };
      }
      agentMap[o.technicianName].osCount++;
      if (o.status === 'FINALIZADA' && o.closedAt) {
        agentMap[o.technicianName].finalizadas.push(o);
      }
    }

    // Para CSAT do atendente local, precisariamos mapear o usuario logado, mas como o firebird só tem NOME_TECNICO, 
    // vamos tentar cruzar pelo nome.
    const users = await prisma.user.findMany({ where: { tenantId }, select: { id: true, name: true } });

    const agentBenchmark = Object.values(agentMap).map(a => {
      let avgSla = null;
      if (a.finalizadas.length > 0) {
        const totalSla = a.finalizadas.reduce((sum, so) => {
          const diffMs = so.closedAt.getTime() - so.openedAt.getTime();
          return sum + (diffMs / (1000 * 60 * 60));
        }, 0);
        avgSla = Math.round((totalSla / a.finalizadas.length) * 10) / 10;
      }

      // Tenta achar o atendente local para pegar o CSAT
      const localUser = users.find(u => u.name.toLowerCase() === a.nome.toLowerCase());
      let avgCsat = null;
      if (localUser) {
        const agentTickets = tickets.filter(t => t.agentId === localUser.id);
        if (agentTickets.length > 0) {
          const totalCsat = agentTickets.reduce((sum, t) => sum + t.rating, 0);
          avgCsat = Math.round((totalCsat / agentTickets.length) * 10) / 10;
        }
      }

      return {
        id: a.nome,
        nome: a.nome,
        osCount: a.osCount,
        avgSla,
        avgCsat
      };
    }).sort((a, b) => b.osCount - a.osCount);

    res.json({
      clientes: clientBenchmark,
      atendentes: agentBenchmark
    });
  } catch (error) {
    console.error('[revenueController] Erro ao obter benchmark:', error);
    res.status(500).json({ error: 'Erro interno ao processar benchmark.' });
  }
}

const { GoogleGenerativeAI } = require('@google/generative-ai');

async function getDetective(req, res) {
  const tenantId = req.user.tenantId;

  try {
    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId }
    });

    const kpiSlaLimitHours = settings?.kpiSlaLimitHours ?? 24;

    // Datas limites
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // 1. Métricas da Semana Atual (últimos 7 dias)
    const currentTickets = await prisma.ticket.count({
      where: { tenantId, createdAt: { gte: sevenDaysAgo } }
    });
    const currentOS = await prisma.serviceOrder.count({
      where: { tenantId, createdAt: { gte: sevenDaysAgo } }
    });

    // O.S. fora do SLA na semana atual
    const slaLimitDateCurrent = new Date(now.getTime() - kpiSlaLimitHours * 60 * 60 * 1000);
    const currentOverdueOS = await prisma.serviceOrder.count({
      where: {
        tenantId,
        createdAt: { gte: sevenDaysAgo },
        status: { in: ['PENDENTE', 'EM_ATENDIMENTO'] },
        createdAt: { lte: slaLimitDateCurrent }
      }
    });

    const currentCsatList = await prisma.ticket.findMany({
      where: { tenantId, rating: { not: null }, resolvedAt: { gte: sevenDaysAgo } },
      select: { rating: true }
    });
    const currentCsat = currentCsatList.length > 0 
      ? Math.round((currentCsatList.reduce((sum, t) => sum + t.rating, 0) / currentCsatList.length) * 10) / 10 
      : 0;

    // 2. Métricas da Semana Anterior (7 a 14 dias atrás)
    const prevTickets = await prisma.ticket.count({
      where: { tenantId, createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } }
    });
    const prevOS = await prisma.serviceOrder.count({
      where: { tenantId, createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } }
    });

    const slaLimitDatePrev = new Date(sevenDaysAgo.getTime() - kpiSlaLimitHours * 60 * 60 * 1000);
    const prevOverdueOS = await prisma.serviceOrder.count({
      where: {
        tenantId,
        createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
        status: { in: ['PENDENTE', 'EM_ATENDIMENTO'] },
        createdAt: { lte: slaLimitDatePrev }
      }
    });

    const prevCsatList = await prisma.ticket.findMany({
      where: { tenantId, rating: { not: null }, resolvedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
      select: { rating: true }
    });
    const prevCsat = prevCsatList.length > 0 
      ? Math.round((prevCsatList.reduce((sum, t) => sum + t.rating, 0) / prevCsatList.length) * 10) / 10 
      : 0;

    // Montar o comparativo
    const stats = {
      atual: { tickets: currentTickets, os: currentOS, overdue: currentOverdueOS, csat: currentCsat },
      anterior: { tickets: prevTickets, os: prevOS, overdue: prevOverdueOS, csat: prevCsat }
    };

    let aiDiagnosis = '';

    if (!settings?.geminiKey) {
      aiDiagnosis = '**Chave do Gemini não configurada.** Vá em Ajustes > iLux Sentinela para cadastrar sua chave e liberar o diagnóstico automático por inteligência artificial.';
    } else {
      try {
        const genAI = new GoogleGenerativeAI(settings.geminiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `Você é o Detetive IA do iLux Sentinela, um analista operacional de suporte e inteligência de receita especialista em locação de impressoras.
        Analise o relatório operacional abaixo de duas semanas consecutivas da empresa e escreva um diagnóstico operacional conciso (em português, formato de parágrafos corridos, use negrito nas métricas chaves para dar impacto).
        Explique as possíveis causas dos desvios (ex: por que o SLA aumentou, impacto nas rescisões de contrato) e sugira 2 ações corretivas imediatas.
        NÃO retorne tópicos, marcadores (bullets) ou cabeçalhos. Apenas texto fluido e profissional em 2 a 3 parágrafos.

        Dados Operacionais (Semana Atual vs. Semana Anterior):
        - Novos Chamados Iniciados: ${currentTickets} vs ${prevTickets}
        - Novas Ordens de Serviço (O.S.): ${currentOS} vs ${prevOS}
        - O.S. ativas estouradas fora do SLA (${kpiSlaLimitHours}h+): ${currentOverdueOS} vs ${prevOverdueOS}
        - Índice Médio de Satisfação (CSAT): ${currentCsat}/5 vs ${prevCsat}/5

        Diagnóstico:`;

        const result = await model.generateContent(prompt);
        aiDiagnosis = result.response.text().trim();
      } catch (err) {
        console.error('[revenueController] Falha ao gerar diagnóstico com Gemini:', err);
        aiDiagnosis = `**Erro na análise por IA:** ${err.message}. Mas você pode acompanhar as variações dos números no painel acima.`;
      }
    }

    res.json({ stats, diagnosis: aiDiagnosis });
  } catch (error) {
    console.error('[revenueController] Erro no Detetive IA:', error);
    res.status(500).json({ error: 'Erro ao processar dados do Detetive IA.' });
  }
}

async function getAuditedTickets(req, res) {
  const tenantId = req.user.tenantId;
  try {
    const tickets = await prisma.ticket.findMany({
      where: {
        tenantId,
        status: 'resolved'
      },
      select: {
        id: true,
        rating: true,
        ratingFeedback: true,
        auditScore: true,
        auditResult: true,
        auditedAt: true,
        createdAt: true,
        resolvedAt: true,
        contact: { select: { name: true, phone: true } },
        agent: { select: { name: true } }
      },
      orderBy: { resolvedAt: 'desc' },
      take: 50
    });

    const formatted = tickets.map(t => ({
      id: t.id,
      contactName: t.contact?.name || t.contact?.phone || 'Cliente',
      agentName: t.agent?.name || 'IA/Sistema',
      rating: t.rating,
      auditScore: t.auditScore,
      auditResult: t.auditResult,
      auditedAt: t.auditedAt,
      createdAt: t.createdAt,
      resolvedAt: t.resolvedAt
    }));

    res.json(formatted);
  } catch (error) {
    console.error('[revenueController] Erro ao buscar atendimentos auditados:', error);
    res.status(500).json({ error: 'Erro ao buscar atendimentos para auditoria.' });
  }
}

async function auditTicket(req, res) {
  const { ticketId } = req.params;
  const tenantId = req.user.tenantId;

  try {
    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId }
    });

    if (!settings?.geminiKey) {
      return res.status(400).json({ error: 'Chave do Gemini não configurada em Ajustes.' });
    }

    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, tenantId },
      include: {
        contact: true,
        agent: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket não encontrado.' });
    }

    if (ticket.messages.length === 0) {
      return res.status(400).json({ error: 'Este atendimento não possui mensagens gravadas para serem auditadas.' });
    }

    // Formatar histórico de mensagens
    const historyText = ticket.messages.map(m => {
      const sender = m.fromBot ? 'IA/Sistema' : (m.fromMe ? (ticket.agent?.name || 'Atendente') : 'Cliente');
      const text = m.body || (m.transcription ? `[Áudio Transcrito: ${m.transcription}]` : '[Mídia/Outro]');
      return `[${m.createdAt.toLocaleTimeString('pt-BR')}] ${sender}: ${text}`;
    }).join('\n');

    const genAI = new GoogleGenerativeAI(settings.geminiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `Você é um auditor de qualidade de atendimento ao cliente por inteligência artificial (QA Analyst).
    Analise a conversa abaixo que ocorreu entre o cliente, a IA/Sistema (robô) e o atendente humano da empresa. Atribua uma nota de 0 a 100 de conformidade geral e elabore um parecer detalhado.

    A sua avaliação deve analisar rigorosamente os seguintes critérios:
    1. **Interação da IA (Robô)**: Se a IA/Sistema respondeu com cordialidade, precisão e de acordo com as informações da empresa.
    2. **Atendimento Humano**: A empatia, o tom de voz e a educação do atendente humano ao falar com o cliente.
    3. **Passagem de Bastão (Transição IA ➔ Humano)**: Avalie se o atendente humano leu o histórico do robô antes de interagir. É considerado um erro grave o atendente fazer perguntas repetidas que o cliente já havia respondido para o robô. A transição deve ser fluida e sem atrito.
    4. **Resolução e Processo**: Se o problema do cliente foi de fato solucionado, se os prazos informados foram corretos e se as diretrizes da empresa foram seguidas.

    Retorne estritamente um JSON contendo as chaves:
    1. "score": número inteiro de 0 a 100.
    2. "report": texto formatado em Markdown descrevendo a análise detalhada de cada critério acima, destacando os "Pontos Fortes", as "Oportunidades de Melhoria" (especialmente em relação à transição IA/Humano e perguntas repetitivas) e um curto "Veredito Final".

    Conversa:
    ${historyText}

    JSON de retorno:`;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text().trim();

    // Limpar tag ```json se houver
    if (responseText.startsWith('```json')) {
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    }

    const parsed = JSON.parse(responseText);

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        auditScore: parseInt(parsed.score),
        auditResult: parsed.report,
        auditedAt: new Date()
      }
    });

    res.json({
      id: updatedTicket.id,
      auditScore: updatedTicket.auditScore,
      auditResult: updatedTicket.auditResult,
      auditedAt: updatedTicket.auditedAt
    });
  } catch (error) {
    console.error('[revenueController] Erro ao auditar ticket:', error);
    res.status(500).json({ error: `Falha na auditoria por IA: ${error.message}` });
  }
}

async function getDrilldown(req, res) {
  const tenantId = req.user.tenantId;
  const { type } = req.params;

  try {
    const settings = await prisma.tenantSettings.findUnique({ where: { tenantId } });
    const kpiSlaLimitHours = settings?.kpiSlaLimitHours ?? 24;
    const slaLimitDate = new Date(Date.now() - kpiSlaLimitHours * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Carregar O.S. reais do Firebird
    const allFirebirdOS = await prisma.externalSyncRecord.findMany({
      where: { tenantId, source: 'firebird', entity: 'serviceOrders' },
      select: { externalId: true, payload: true, receivedAt: true },
    });

    function fbStatus(payload) {
      const raw = payload?.raw || payload || {};
      const status = String(raw.status || raw.nmstatus || payload?.status || '').trim().toUpperCase();
      const closedAt = raw.dtfechamento || payload?.closedAt;
      if (closedAt || ['O', 'F', 'C', 'FINALIZADA', 'CONCLUIDA'].includes(status)) return 'FINALIZADA';
      if (status.includes('AGUARD')) return 'AGUARDANDO_RETORNO';
      if (status.includes('ATEND') || ['E', 'M', 'T'].includes(status)) return 'EM_ATENDIMENTO';
      return 'PENDENTE';
    }

    function fbDate(payload, ...keys) {
      const raw = payload?.raw || payload || {};
      for (const key of keys) {
        const val = raw[key] || raw[key.toLowerCase()] || raw[key.toUpperCase()] || payload?.[key];
        if (val) { const d = new Date(val); if (!Number.isNaN(d.getTime())) return d; }
      }
      return null;
    }

    const classified = allFirebirdOS.map(r => {
      const p = r.payload || {};
      const raw = p.raw || p;
      return {
        externalId: r.externalId,
        status: fbStatus(p),
        openedAt: fbDate(p, 'dtinclusao', 'createdAt', 'updatedAt'),
        closedAt: fbDate(p, 'dtfechamento', 'closedAt'),
        clientExternalId: String(raw.cdcliente || p.clientExternalId || ''),
        clientName: String(raw.nmcliente || p.clientName || ''),
        technician: raw.nmsuportet || raw.nmsuportel || p.technician || '',
        equipmentId: String(raw.cdequipamento || p.equipmentExternalId || ''),
        equipmentModel: String(raw.modelo || p.equipmentModel || ''),
        osType: String(raw.nmostp || p.osType || ''),
        defect: String(raw.obsdefeitocli || p.defect || ''),
      };
    });

    // Buscar nomes de clientes do CRM para complementar
    const allClientIds = [...new Set(classified.map(o => o.clientExternalId).filter(Boolean))];
    const crmCustomers = allClientIds.length > 0
      ? await prisma.crmCustomer.findMany({
          where: { tenantId, externalId: { in: allClientIds } },
          select: { externalId: true, name: true, fantasyName: true, phone: true },
        })
      : [];
    const customerMap = Object.fromEntries(crmCustomers.map(c => [c.externalId, c]));

    function enrich(item) {
      const cust = customerMap[item.clientExternalId];
      return {
        externalId: item.externalId,
        status: item.status,
        openedAt: item.openedAt,
        clientName: cust?.fantasyName || cust?.name || item.clientName || 'Cliente #' + item.clientExternalId,
        clientPhone: cust?.phone || '',
        technician: item.technician,
        equipmentModel: item.equipmentModel,
        osType: item.osType,
        defect: item.defect,
      };
    }

    let results = [];

    if (type === 'mrr_risk') {
      results = classified
        .filter(o => (o.status === 'PENDENTE' || o.status === 'EM_ATENDIMENTO') && o.openedAt && o.openedAt <= slaLimitDate)
        .map(enrich);
    } else if (type === 'stalled_estimates') {
      results = classified
        .filter(o => o.status === 'AGUARDANDO_RETORNO')
        .map(enrich);
    } else if (type === 'no_technician') {
      results = classified
        .filter(o => o.status === 'PENDENTE' && !o.technician)
        .map(enrich);
    } else if (type === 'bad_csat') {
      // CSAT vem dos tickets do WhatsApp (tabela local)
      const tickets = await prisma.ticket.findMany({
        where: { tenantId, rating: { not: null, lte: 2 }, resolvedAt: { gte: thirtyDaysAgo } },
        include: { contact: { select: { id: true, name: true, phone: true } } },
        orderBy: { resolvedAt: 'desc' }
      });
      results = tickets.map(t => ({
        externalId: t.id,
        status: 'CSAT ≤ 2',
        openedAt: t.resolvedAt,
        clientName: t.contact?.name || 'Desconhecido',
        clientPhone: t.contact?.phone || '',
        rating: t.rating,
      }));
    } else if (type === 'reincident_equipments') {
      const equipCounts = {};
      for (const o of classified) {
        if (o.openedAt && o.openedAt >= thirtyDaysAgo && o.equipmentId) {
          if (!equipCounts[o.equipmentId]) equipCounts[o.equipmentId] = { count: 0, model: o.equipmentModel, clientName: '', items: [] };
          equipCounts[o.equipmentId].count++;
          equipCounts[o.equipmentId].items.push(o);
          const cust = customerMap[o.clientExternalId];
          if (cust) equipCounts[o.equipmentId].clientName = cust.fantasyName || cust.name || '';
        }
      }
      results = Object.entries(equipCounts)
        .filter(([, v]) => v.count > 2)
        .map(([equipId, v]) => ({
          externalId: equipId,
          equipmentModel: v.model,
          clientName: v.clientName,
          count: v.count,
        }));
    }

    res.json(results);
  } catch (error) {
    console.error('[revenueController] Erro no getDrilldown:', error);
    res.status(500).json({ error: 'Erro ao buscar dados detalhados' });
  }
}

module.exports = { 
  getRevenueDashboard, 
  getBenchmark, 
  getDetective, 
  getAuditedTickets, 
  auditTicket,
  getDrilldown
};
