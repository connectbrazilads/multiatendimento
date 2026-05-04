const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Busca por qualquer contato que tenha "AFABAN" no nome ou fantasia
  const contacts = await prisma.contact.findMany({
    where: {
      OR: [
        { name: { contains: 'AFABAN', mode: 'insensitive' } },
        { fantasyName: { contains: 'AFABAN', mode: 'insensitive' } }
      ]
    }
  });
  console.log('CONTATOS ENCONTRADOS:', JSON.stringify(contacts, null, 2));
  await prisma.$disconnect();
}
check();
