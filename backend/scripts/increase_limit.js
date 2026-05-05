const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const slug = process.argv[2];
  const limit = parseInt(process.argv[3]) || 5;

  if (!slug) {
    console.log('Uso: node scripts/increase_limit.js <slug-do-tenant> [novo-limite]');
    process.exit(1);
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    console.error(`Tenant com slug "${slug}" não encontrado.`);
    process.exit(1);
  }

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { maxConnections: limit }
  });

  console.log(`Sucesso! Limite do tenant "${tenant.name}" (${slug}) atualizado para ${limit}.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
