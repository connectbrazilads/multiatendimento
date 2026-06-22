const prisma = require('../lib/prisma');

async function getRevenueDashboard(req, res) {
  const tenantId = req.user.tenantId;

  try {
    // 1. Buscar as configurações de KPI do Tenant
    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId }
    });

    const kpiContractValue = settings?.kpiContractValue ?? 1200.0;
    const kpiServiceValue = settings?.kpiServiceValue ?? 350.0;
    const kpiSlaLimitHours = settings?.kpiSlaLimitHours ?? 24;

    // 2. CALCULAR MENSALIDADES (MRR) EM RISCO POR QUEBRA DE SLA
    // Consideramos ordens de serviço (O.S.) ativas (PENDENTE ou EM_ATENDIMENTO)
    // criadas há mais de X horas (kpiSlaLimitHours) sem resolução.
    const slaLimitDate = new Date(Date.now() - kpiSlaLimitHours * 60 * 60 * 1000);
    const criticalServiceOrders = await prisma.serviceOrder.findMany({
      where: {
        tenantId,
        status: { in: ['PENDENTE', 'EM_ATENDIMENTO'] },
        createdAt: { lte: slaLimitDate }
      },
      select: { contactId: true }
    });

    // Remover duplicados de clientes para contar quantos contratos de locação estão sob risco
    const uniqueContactsWithDowntime = [...new Set(criticalServiceOrders.map(so => so.contactId))];
    const mrrInRisk = uniqueContactsWithDowntime.length * kpiContractValue;

    // 3. ORÇAMENTOS DE MANUTENÇÃO PARADOS (DINHEIRO NA MESA)
    // O.S. que estão aguardando retorno de aprovação do cliente há mais de 24 horas
    const waitingApprovalLimitDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const waitingApprovalOrders = await prisma.serviceOrder.findMany({
      where: {
        tenantId,
        status: 'AGUARDANDO_RETORNO',
        updatedAt: { lte: waitingApprovalLimitDate }
      }
    });

    const stalledEstimates = waitingApprovalOrders.length * kpiServiceValue;

    // TOTAL DE RECEITA EM RISCO HOJE
    const receitaEmRiscoHoje = mrrInRisk + stalledEstimates;

    // 4. CAUSAS RAIZ (Gargalos Técnicos)
    // Gargalo A: Chamados pendentes sem técnico alocado
    const noTechnicianCount = await prisma.serviceOrder.count({
      where: { tenantId, status: 'PENDENTE', userId: null }
    });

    // Gargalo B: Impressoras com problemas reincidentes (mais de 2 chamados nos últimos 30 dias)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const serviceOrdersLast30Days = await prisma.serviceOrder.groupBy({
      by: ['equipmentId'],
      where: { 
        tenantId, 
        createdAt: { gte: thirtyDaysAgo }
      },
      _count: { id: true }
    });
    const reincidentEquipmentsCount = serviceOrdersLast30Days.filter(group => group._count.id > 2).length;

    // Gargalo C: Clientes insatisfeitos (CSAT ruim <= 2 estrelas) nos últimos 30 dias
    const badCsatCount = await prisma.ticket.count({
      where: {
        tenantId,
        rating: { not: null, lte: 2 },
        resolvedAt: { gte: thirtyDaysAgo }
      }
    });

    // 5. FUNIL DE ATENDIMENTO
    const totalPendente = await prisma.serviceOrder.count({ where: { tenantId, status: 'PENDENTE' } });
    const totalEmAtendimento = await prisma.serviceOrder.count({ where: { tenantId, status: 'EM_ATENDIMENTO' } });
    const totalAguardandoRetorno = await prisma.serviceOrder.count({ where: { tenantId, status: 'AGUARDANDO_RETORNO' } });
    const totalFinalizada = await prisma.serviceOrder.count({ 
      where: { 
        tenantId, 
        status: 'FINALIZADA',
        resolvedAt: { gte: thirtyDaysAgo } 
      } 
    });

    res.json({
      receitaEmRiscoHoje,
      mrrInRisk,
      stalledEstimates,
      kpis: {
        kpiContractValue,
        kpiServiceValue,
        kpiSlaLimitHours
      },
      causas: [
        { id: '1', descricao: 'Chamados pendentes sem técnico designado', quantidade: noTechnicianCount, prioridade: 'alta' },
        { id: '2', descricao: 'Orçamentos de peças/serviço aguardando aprovação > 24h', quantidade: waitingApprovalOrders.length, prioridade: 'media' },
        { id: '3', descricao: 'Equipamentos reincidentes com falhas recorrentes (> 2 OS/mês)', quantidade: reincidentEquipmentsCount, prioridade: 'alta' },
        { id: '4', descricao: 'Chamados com avaliações ruins dos clientes (CSAT <= 2)', quantidade: badCsatCount, prioridade: 'alta' }
      ],
      funnel: {
        novosChamados: totalPendente,
        emAtendimento: totalEmAtendimento,
        aguardandoCliente: totalAguardandoRetorno,
        finalizadosMes: totalFinalizada
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
    const contacts = await prisma.contact.findMany({
      where: { tenantId },
      select: { id: true, name: true, fantasyName: true }
    });

    const users = await prisma.user.findMany({
      where: { tenantId },
      select: { id: true, name: true }
    });

    const serviceOrders = await prisma.serviceOrder.findMany({
      where: { tenantId },
      select: { id: true, contactId: true, userId: true, status: true, createdAt: true, resolvedAt: true, closedAt: true }
    });

    const tickets = await prisma.ticket.findMany({
      where: { tenantId, rating: { not: null } },
      select: { id: true, contactId: true, agentId: true, rating: true }
    });

    // Calcular por Cliente
    const clientBenchmark = contacts.map(c => {
      const clientOrders = serviceOrders.filter(so => so.contactId === c.id);
      const clientTickets = tickets.filter(t => t.contactId === c.id);
      
      const osCount = clientOrders.length;
      
      // SLA médio em horas para as finalizadas
      const resolvedOrders = clientOrders.filter(so => so.status === 'FINALIZADA' && (so.resolvedAt || so.closedAt));
      let avgSla = 0;
      if (resolvedOrders.length > 0) {
        const totalSla = resolvedOrders.reduce((sum, so) => {
          const end = so.resolvedAt || so.closedAt;
          const diffMs = end.getTime() - so.createdAt.getTime();
          return sum + (diffMs / (1000 * 60 * 60)); // em horas
        }, 0);
        avgSla = Math.round((totalSla / resolvedOrders.length) * 10) / 10;
      }

      // CSAT médio
      let avgCsat = 0;
      if (clientTickets.length > 0) {
        const totalCsat = clientTickets.reduce((sum, t) => sum + t.rating, 0);
        avgCsat = Math.round((totalCsat / clientTickets.length) * 10) / 10;
      }

      return {
        id: c.id,
        nome: c.fantasyName || c.name || 'Cliente Sem Nome',
        osCount,
        avgSla: osCount > 0 ? avgSla : null,
        avgCsat: clientTickets.length > 0 ? avgCsat : null
      };
    }).filter(cb => cb.osCount > 0 || cb.avgCsat !== null)
      .sort((a, b) => b.osCount - a.osCount)
      .slice(0, 10); // Top 10

    // Calcular por Atendente
    const agentBenchmark = users.map(u => {
      const agentOrders = serviceOrders.filter(so => so.userId === u.id);
      const agentTickets = tickets.filter(t => t.agentId === u.id);
      
      const osCount = agentOrders.length;

      const resolvedOrders = agentOrders.filter(so => so.status === 'FINALIZADA' && (so.resolvedAt || so.closedAt));
      let avgSla = 0;
      if (resolvedOrders.length > 0) {
        const totalSla = resolvedOrders.reduce((sum, so) => {
          const end = so.resolvedAt || so.closedAt;
          const diffMs = end.getTime() - so.createdAt.getTime();
          return sum + (diffMs / (1000 * 60 * 60));
        }, 0);
        avgSla = Math.round((totalSla / resolvedOrders.length) * 10) / 10;
      }

      let avgCsat = 0;
      if (agentTickets.length > 0) {
        const totalCsat = agentTickets.reduce((sum, t) => sum + t.rating, 0);
        avgCsat = Math.round((totalCsat / agentTickets.length) * 10) / 10;
      }

      return {
        id: u.id,
        nome: u.name,
        osCount,
        avgSla: osCount > 0 ? avgSla : null,
        avgCsat: agentTickets.length > 0 ? avgCsat : null
      };
    }).filter(ab => ab.osCount > 0 || ab.avgCsat !== null)
      .sort((a, b) => b.osCount - a.osCount)
      .slice(0, 10);

    res.json({ clientes: clientBenchmark, atendentes: agentBenchmark });
  } catch (error) {
    console.error('[revenueController] Erro ao obter benchmark:', error);
    res.status(500).json({ error: 'Erro ao processar dados de benchmark.' });
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
      aiDiagnosis = '**Chave do Gemini não configurada.** Vá em Ajustes > RevGuard AI para cadastrar sua chave e liberar o diagnóstico automático por inteligência artificial.';
    } else {
      try {
        const genAI = new GoogleGenerativeAI(settings.geminiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `Você é o Detetive IA do RevGuard, um analista operacional de suporte e inteligência de receita especialista em locação de impressoras.
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

module.exports = { 
  getRevenueDashboard, 
  getBenchmark, 
  getDetective, 
  getAuditedTickets, 
  auditTicket 
};
