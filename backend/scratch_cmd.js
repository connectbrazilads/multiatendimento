const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.crmSyncQueue.findUnique({where: {id: 'cmqlec59p04or4f38y1t3v74p'}})
  .then(x => console.log(JSON.stringify(x, null, 2)))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
