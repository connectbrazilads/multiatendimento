const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  // 1. Contatos com opt-in ativado para WhatsApp billing
  const optInContacts = await prisma.contact.findMany({
    where: { enableWhatsAppBilling: true },
    select: { id: true, name: true, cpfCnpj: true, phone: true, whatsapp: true }
  });
  console.log('=== CONTATOS COM OPT-IN ATIVADO: ' + optInContacts.length);
  optInContacts.forEach(c => {
    const cnpj = c.cpfCnpj || '';
    const phone = c.whatsapp || c.phone || '';
    console.log('  OPTIN: ' + c.name + ' | ' + cnpj + ' | ' + phone);
  });

  // 2. Logs de hoje
  const startOfDay = new Date('2026-08-20T00:00:00-03:00');
  const logs = await prisma.billingLog.findMany({
    where: { sentAt: { gte: startOfDay } },
    orderBy: { sentAt: 'asc' },
    select: { cpfCnpj: true, clientName: true, status: true, errorMessage: true, sentAt: true }
  });

  const sent = logs.filter(l => l.status === 'SUCCESS');
  const failed = logs.filter(l => l.status === 'FAILED');
  const skipped = logs.filter(l => l.status === 'SKIPPED');
  const testLogs = logs.filter(l => l.status === 'TEST');

  console.log('\n=== ENVIADOS HOJE VIA WHATSAPP: ' + sent.length);
  sent.forEach(l => console.log('  ENVIADO: ' + l.clientName + ' | CNPJ: ' + l.cpfCnpj));

  console.log('\n=== ERROS TECNICOS (FAILED): ' + failed.length);
  failed.forEach(l => console.log('  ERRO: ' + l.clientName + ' | ' + l.cpfCnpj + ' | ' + l.errorMessage));

  console.log('\n=== IGNORADOS POR REGRA (SKIPPED/sem opt-in/sem telefone): ' + skipped.length);
  skipped.forEach(l => console.log('  IGNORADO: ' + l.clientName + ' | ' + l.cpfCnpj + ' | ' + l.errorMessage));

  console.log('\n=== TESTES (TEST): ' + testLogs.length);

  // 3. Cruzamento: quais opt-in NAO receberam hoje?
  const sentCnpjs = new Set(sent.map(l => l.cpfCnpj));
  const notSentOptIn = optInContacts.filter(c => !sentCnpjs.has(c.cpfCnpj));
  console.log('\n=== OPT-IN ATIVADO MAS NAO ENVIADO HOJE: ' + notSentOptIn.length);
  notSentOptIn.forEach(c => {
    // Verifica se aparece nos logs com erro
    const logEntry = logs.find(l => l.cpfCnpj === c.cpfCnpj);
    const reason = logEntry ? logEntry.status + ': ' + (logEntry.errorMessage || '') : 'SEM REGISTRO NOS LOGS';
    console.log('  NAO ENVIADO: ' + c.name + ' | ' + c.cpfCnpj + ' | Motivo: ' + reason);
  });
}

run().catch(console.error).finally(() => prisma.$disconnect());
