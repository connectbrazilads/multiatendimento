const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Empresa Demo',
      slug: 'demo',
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
      email: 'admin@demo.com',
      password: hash,
      role: 'admin',
    },
  });

  console.log('Tenant criado:', tenant.id);
  console.log('Login: admin@demo.com / admin123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
