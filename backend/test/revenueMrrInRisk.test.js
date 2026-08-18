const test = require('node:test');
const assert = require('node:assert/strict');
const prisma = require('../src/lib/prisma');
const { getRevenueDashboard } = require('../src/controllers/revenueController');
const crmController = require('../src/controllers/crmController');

function fakeRes() {
  const res = {};
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

test('mrrInRisk prioriza contrato ativo real, depois total_mensalidade, depois fallback generico', async (context) => {
  const originalSettingsFindUnique = prisma.tenantSettings.findUnique;
  const originalServiceOrderFindMany = prisma.serviceOrder.findMany;
  const originalServiceOrderCount = prisma.serviceOrder.count;
  const originalServiceOrderGroupBy = prisma.serviceOrder.groupBy;
  const originalContactFindMany = prisma.contact.findMany;
  const originalTicketCount = prisma.ticket.count;
  const originalLoadContracts = crmController.loadContracts;

  context.after(() => {
    prisma.tenantSettings.findUnique = originalSettingsFindUnique;
    prisma.serviceOrder.findMany = originalServiceOrderFindMany;
    prisma.serviceOrder.count = originalServiceOrderCount;
    prisma.serviceOrder.groupBy = originalServiceOrderGroupBy;
    prisma.contact.findMany = originalContactFindMany;
    prisma.ticket.count = originalTicketCount;
    crmController.loadContracts = originalLoadContracts;
  });

  prisma.tenantSettings.findUnique = async () => ({
    kpiContractValue: 1200,
    kpiServiceValue: 350,
    kpiSlaLimitHours: 24,
  });

  prisma.serviceOrder.findMany = async ({ where }) => {
    // criticalServiceOrders usa status: { in: [...] }; waitingApprovalOrders usa status: 'AGUARDANDO_RETORNO'.
    if (where.status && Array.isArray(where.status.in)) {
      return [
        { contactId: 'contact-real-contract' },
        { contactId: 'contact-total-mensalidade' },
        { contactId: 'contact-fallback' },
      ];
    }
    return [];
  };
  prisma.serviceOrder.count = async () => 0;
  prisma.serviceOrder.groupBy = async () => [];
  prisma.ticket.count = async () => 0;

  prisma.contact.findMany = async ({ where }) => {
    const byId = {
      'contact-real-contract': { crmCustomer: { externalId: 'ext-1', raw: { total_mensalidade: '999.99' } } },
      'contact-total-mensalidade': { crmCustomer: { externalId: 'ext-2', raw: { total_mensalidade: '850,00' } } },
      'contact-fallback': { crmCustomer: { externalId: 'ext-3', raw: {} } },
    };
    return where.id.in.map((id) => byId[id]);
  };

  crmController.loadContracts = async (tenantId, externalId) => {
    if (externalId === 'ext-1') {
      return [
        { isActive: true, monthlyValue: 500 },
        { isActive: true, monthlyValue: 300 },
        { isActive: false, monthlyValue: 10000 },
      ];
    }
    // ext-2 e ext-3 nao tem contrato ativo encontrado.
    return [];
  };

  const req = { user: { tenantId: 'tenant-1' } };
  const res = fakeRes();
  await getRevenueDashboard(req, res);

  // contact-real-contract: soma dos contratos ativos (500 + 300 = 800), ignora total_mensalidade.
  // contact-total-mensalidade: sem contrato ativo -> usa total_mensalidade (850).
  // contact-fallback: sem contrato ativo e sem total_mensalidade -> usa kpiContractValue (1200).
  assert.equal(res.body.mrrInRisk, 800 + 850 + 1200);
});
