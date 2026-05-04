const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEquipments() {
  const phone = '555186876737'; // O número do Diego no log
  const contact = await prisma.contact.findFirst({
    where: { phone: { contains: phone } }
  });

  if (!contact) {
    console.log('Contato não encontrado!');
    return;
  }

  console.log(`Contato encontrado: ${contact.name} (ID: ${contact.id})`);

  const equipments = await prisma.equipment.findMany({
    where: { contactId: contact.id }
  });

  console.log(`Equipamentos encontrados no DB: ${equipments.length}`);
  equipments.forEach(e => {
    console.log(`- ${e.model} (Série: ${e.serialNumber}) | Ativo: ${e.isActive}`);
  });

  await prisma.$disconnect();
}

checkEquipments();
