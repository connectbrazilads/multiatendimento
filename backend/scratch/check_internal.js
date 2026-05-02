const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const count = await prisma.internalMessage.count();
  const last = await prisma.internalMessage.findFirst({ orderBy: { createdAt: 'desc' } });
  console.log('TOTAL_INTERNAL_MESSAGES:', count);
  console.log('LAST_MESSAGE:', last);
  process.exit(0);
}

check();
