const test = require('node:test');
const assert = require('node:assert/strict');
const prisma = require('../src/lib/prisma');
const billingDocuments = require('../src/services/billingDocumentService');
const evolutionService = require('../src/services/evolutionService');
const { autoSendBilling } = require('../src/controllers/billingController');

const TOKEN = 'agente-token-teste';

function fakeReq(body) {
  return {
    body,
    header(name) {
      return name.toLowerCase() === 'x-firebird-token' ? TOKEN : undefined;
    },
  };
}

function fakeRes() {
  const res = {};
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

const TENANT = {
  id: 'tenant-1',
  slug: 'lcd',
  settings: { firebirdClientToken: TOKEN, evolutionUrl: 'https://evolution.example', evolutionKey: 'evo-key' },
  instances: [{ id: 'instance-1', instanceName: 'atendimento', status: 'connected' }],
};

test('valida campos obrigatorios antes de qualquer acesso ao banco', async () => {
  const res1 = fakeRes();
  await autoSendBilling(fakeReq({}), res1);
  assert.equal(res1.statusCode, 400);

  const res2 = fakeRes();
  await autoSendBilling(fakeReq({ tenantSlug: 'lcd' }), res2);
  assert.equal(res2.statusCode, 400);

  const res3 = fakeRes();
  await autoSendBilling(fakeReq({ tenantSlug: 'lcd', receivableExternalId: '18741' }), res3);
  assert.equal(res3.statusCode, 400);
});

test('404 quando o tenant nao existe', async (context) => {
  const original = prisma.tenant.findUnique;
  context.after(() => { prisma.tenant.findUnique = original; });
  prisma.tenant.findUnique = async () => null;

  const res = fakeRes();
  await autoSendBilling(fakeReq({
    tenantSlug: 'inexistente',
    receivableExternalId: '18741',
    documents: [{ documentType: 'boleto', pdfBase64: 'AA==', fileName: 'a.pdf' }],
  }), res);
  assert.equal(res.statusCode, 404);
});

test('404 quando o titulo nao foi sincronizado do Firebird', async (context) => {
  const originalTenant = prisma.tenant.findUnique;
  const originalRecord = prisma.externalSyncRecord.findFirst;
  context.after(() => {
    prisma.tenant.findUnique = originalTenant;
    prisma.externalSyncRecord.findFirst = originalRecord;
  });
  prisma.tenant.findUnique = async () => TENANT;
  prisma.externalSyncRecord.findFirst = async () => null;

  const res = fakeRes();
  await autoSendBilling(fakeReq({
    tenantSlug: 'lcd',
    receivableExternalId: '99999',
    documents: [{ documentType: 'boleto', pdfBase64: 'AA==', fileName: 'a.pdf' }],
  }), res);
  assert.equal(res.statusCode, 404);
  assert.match(res.body.error, /não encontrado/);
});

test('nunca chama o WhatsApp quando o opt-in do contato esta desligado', async (context) => {
  const originalTenant = prisma.tenant.findUnique;
  const originalExternalFindFirst = prisma.externalSyncRecord.findFirst;
  const originalExternalFindUnique = prisma.externalSyncRecord.findUnique;
  const originalCustomerFindFirst = prisma.crmCustomer.findFirst;
  const originalContactFindMany = prisma.contact.findMany;
  const originalBillingLogCreate = prisma.billingLog.create;
  const originalQueue = billingDocuments.queueDocumentRequest;
  const originalComplete = billingDocuments.completeDocumentRequest;
  const originalSendMedia = evolutionService.sendMedia;
  const originalSendText = evolutionService.sendText;
  context.after(() => {
    prisma.tenant.findUnique = originalTenant;
    prisma.externalSyncRecord.findFirst = originalExternalFindFirst;
    prisma.externalSyncRecord.findUnique = originalExternalFindUnique;
    prisma.crmCustomer.findFirst = originalCustomerFindFirst;
    prisma.contact.findMany = originalContactFindMany;
    prisma.billingLog.create = originalBillingLogCreate;
    billingDocuments.queueDocumentRequest = originalQueue;
    billingDocuments.completeDocumentRequest = originalComplete;
    evolutionService.sendMedia = originalSendMedia;
    evolutionService.sendText = originalSendText;
  });

  prisma.tenant.findUnique = async () => TENANT;
  prisma.externalSyncRecord.findFirst = async ({ where }) => {
    if (where.entity === 'receivables') {
      return { payload: { clientExternalId: '326' } };
    }
    return null;
  };
  prisma.crmCustomer.findFirst = async ({ where, include }) => {
    if (where.externalId === '326') {
      return {
        id: 'crm-customer-1', externalId: '326', name: 'Postal Digital LTDA', fantasyName: 'POSTAL DIGITAL', cpfCnpj: '01971259000142',
      };
    }
    if (include?.whatsappContacts) {
      // findContactByCpfCnpj's first lookup path.
      return {
        whatsappContacts: [{ id: 'contact-1', name: 'Postal Digital', enableWhatsAppBilling: false, whatsapp: '5551999999999', externalSource: null }],
      };
    }
    return null;
  };
  prisma.contact.findMany = async () => [];
  let queuedDocument = false;
  billingDocuments.queueDocumentRequest = async ({ documentType }) => {
    queuedDocument = true;
    return { id: `req-${documentType}`, externalId: `x:${documentType}`, payload: { documentType } };
  };
  billingDocuments.completeDocumentRequest = async () => {};
  prisma.externalSyncRecord.findUnique = async ({ where }) => ({
    payload: { fileName: 'BOLETO NF 14494 - POSTAL DIGITAL.pdf', mediaUrl: '/uploads/media/fake.pdf', mimeType: 'application/pdf', documentType: 'boleto' },
  });
  let billingLogged = null;
  prisma.billingLog.create = async ({ data }) => { billingLogged = data; return data; };
  let mediaSent = false;
  let textSent = false;
  evolutionService.sendMedia = async () => { mediaSent = true; return {}; };
  evolutionService.sendText = async () => { textSent = true; return {}; };

  const res = fakeRes();
  await autoSendBilling(fakeReq({
    tenantSlug: 'lcd',
    receivableExternalId: '18741',
    sendPolicy: 'Somente Marcados',
    documents: [{ documentType: 'boleto', pdfBase64: 'AA==', fileName: 'a.pdf', mimeType: 'application/pdf' }],
  }), res);

  assert.equal(res.statusCode, undefined); // 200 default
  assert.equal(res.body.success, true);
  assert.equal(res.body.skipped, true);
  assert.equal(mediaSent, false, 'nao deveria ter enviado midia com opt-in desligado');
  assert.equal(textSent, false, 'nao deveria ter enviado texto com opt-in desligado');
  // O endpoint deve validar o opt-in antes de persistir/cachar os PDFs.
  assert.equal(queuedDocument, false);
  assert.equal(billingLogged.status, 'SKIPPED');
  assert.match(billingLogged.errorMessage, /desativado para este contato/);
});
