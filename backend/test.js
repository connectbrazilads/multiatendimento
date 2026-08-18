const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const records = await prisma.externalSyncRecord.findMany({
    where: { source: 'firebird', entity: 'serviceOrders' },
    select: { externalId: true, payload: true, receivedAt: true },
    take: 3,
    orderBy: { receivedAt: 'desc' }
  });
  for (const r of records) {
    const p = r.payload;
    const raw = p?.raw || p || {};
    console.log('--- externalId:', r.externalId);
    console.log('dtinclusao:', raw.dtinclusao, '| dtfechamento:', raw.dtfechamento);
    console.log('status:', raw.nmstatus, raw.status);
    console.log('cliente:', raw.cdcliente, raw.nmcliente);
    console.log('tecnico:', raw.nmsuportet);
    console.log('');
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
