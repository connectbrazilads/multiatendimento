const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function run() {
  const hashedPassword = await bcrypt.hash('12345678', 10);
  
  // 1. Promove todos os usuários existentes para 'admin' (para garantir que você tenha acesso)
  const updated = await prisma.user.updateMany({
    data: { role: 'admin' }
  });
  console.log(`Atualizados ${updated.count} usuários para ADMIN.`);

  // 2. Cria ou busca o tenant master para o SuperAdmin
  const masterTenant = await prisma.tenant.upsert({
    where: { slug: 'master' },
    update: {},
    create: { name: 'Sistema Master', slug: 'master', plan: 'enterprise', settings: { create: {} } }
  });

  // 3. Cria o SuperAdmin mestre
  const superEmail = 'superadmin@teste.com';
  let superUser = await prisma.user.findFirst({ where: { email: superEmail } });
  
  if (!superUser) {
    superUser = await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: superEmail,
        password: hashedPassword,
        role: 'superadmin',
        active: true,
        tenantId: masterTenant.id
      }
    });
    console.log('SuperAdmin criado com sucesso!');
  } else {
    await prisma.user.update({
      where: { id: superUser.id },
      data: { role: 'superadmin', tenantId: masterTenant.id }
    });
    console.log('Usuário existente promovido a SuperAdmin!');
  }

  console.log('--- CREDENCIAIS ---');
  console.log('SuperAdmin: superadmin@teste.com / Senha: 12345678');
  console.log('Seu usuário atual agora é ADMIN.');
  
  await prisma.$disconnect();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
