const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Limpando registros antigos...');
  await prisma.user.deleteMany({});
  await prisma.tenantSettings.deleteMany({});
  await prisma.tenant.deleteMany({});

  console.log('Criando tenant com ID antigo...');
  const tenant = await prisma.tenant.create({
    data: {
      id: 'cmonvybip0000gmivu3q6sqly',
      name: 'LCD Digital',
      slug: 'lcddigital',
      settings: {
        create: {
          botEnabled: false,
          botTransferWord: 'humano',
        },
      },
    },
  });

  const hash = await bcrypt.hash('admin123', 10);
  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: 'Admin',
      email: 'admin@lcddigital.com.br',
      password: hash,
      role: 'admin',
    },
  });

  console.log('Tenant criado com ID antigo:', tenant.id);
  console.log('Login: admin@lcddigital.com.br / admin123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
