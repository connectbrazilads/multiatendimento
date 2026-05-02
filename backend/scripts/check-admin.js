/**
 * check-admin.js — Script seguro para verificar e remover conta demo
 * 
 * Rodar na VPS:
 *   node scripts/check-admin.js
 * 
 * O script NÃO apaga nada automaticamente — apenas reporta o que encontrou.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Verificando contas de demo no banco de dados...\n');

  // Verifica se a conta demo existe
  const demoUser = await prisma.user.findFirst({
    where: { email: 'admin@demo.com' },
    include: { tenant: { select: { name: true, slug: true } } },
  });

  if (!demoUser) {
    console.log('✅ Conta admin@demo.com NÃO existe no banco. Nenhuma ação necessária.\n');
    return;
  }

  console.log('⚠️  CONTA DEMO ENCONTRADA:');
  console.log(`   Email   : ${demoUser.email}`);
  console.log(`   Nome    : ${demoUser.name}`);
  console.log(`   Role    : ${demoUser.role}`);
  console.log(`   Tenant  : ${demoUser.tenant?.name} (slug: ${demoUser.tenant?.slug})`);
  console.log(`   Ativo   : ${demoUser.active}`);
  console.log(`   ID      : ${demoUser.id}`);
  console.log('\n⚠️  AÇÃO NECESSÁRIA: Desative ou remova esta conta manualmente.');
  console.log('   Para desativar (seguro): UPDATE "User" SET active = false WHERE email = \'admin@demo.com\';');
  console.log('   Para remover (se não tiver dados vinculados): DELETE FROM "User" WHERE email = \'admin@demo.com\';\n');

  // Verifica o tenant demo
  const demoTenant = await prisma.tenant.findFirst({
    where: { slug: 'demo' },
    include: { _count: { select: { users: true, tickets: true, contacts: true } } },
  });

  if (demoTenant) {
    console.log('⚠️  TENANT DEMO ENCONTRADO:');
    console.log(`   ID      : ${demoTenant.id}`);
    console.log(`   Nome    : ${demoTenant.name}`);
    console.log(`   Usuários: ${demoTenant._count.users}`);
    console.log(`   Tickets : ${demoTenant._count.tickets}`);
    console.log(`   Contatos: ${demoTenant._count.contacts}`);
    if (demoTenant._count.tickets === 0 && demoTenant._count.contacts === 0) {
      console.log('   → Tenant vazio. Pode ser removido com segurança.');
    } else {
      console.log('   → Tenant com dados. Remova com cuidado (pode haver dados de teste reais).');
    }
  }
}

main()
  .catch(e => { console.error('❌ Erro:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
