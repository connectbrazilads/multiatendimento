const prisma = require('../lib/prisma');

async function isWithinBusinessHours(tenantId) {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 (Sun) to 6 (Sat)
  const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

  const hours = await prisma.businessHour.findUnique({
    where: { 
      tenantId_dayOfWeek: { tenantId, dayOfWeek } 
    }
  });

  // Se não houver horário configurado, assume que está aberto (ou fechado, depende da política)
  // No SaaS, geralmente se não configurou, está aberto.
  if (!hours || !hours.active) return true;

  return currentTime >= hours.start && currentTime <= hours.end;
}

module.exports = { isWithinBusinessHours };
