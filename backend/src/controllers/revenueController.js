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
        createdAt: { gte: thirtyDaysAgo },
        equipmentId: { not: null }
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

module.exports = { getRevenueDashboard };
