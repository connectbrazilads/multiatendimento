const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const all = await p.tenantSettings.findMany();
  console.log('Settings atuais:', JSON.stringify(all, null, 2));

  // Corrige evolutionUrl se estiver errada (não começa com http)
  for (const s of all) {
    if (s.evolutionUrl && !s.evolutionUrl.startsWith('http')) {
      console.log(`Corrigindo tenant ${s.tenantId}: evolutionUrl="${s.evolutionUrl}" → limpar`);
      await p.tenantSettings.update({
        where: { id: s.id },
        data: { evolutionUrl: null },
      });
    }
  }
  console.log('Pronto.');
}

main().catch(console.error).finally(() => p.$disconnect());
