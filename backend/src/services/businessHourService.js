const prisma = require('../lib/prisma');

const BUSINESS_HOURS_TIMEZONE = process.env.BUSINESS_HOURS_TZ || process.env.APP_TIMEZONE || 'America/Sao_Paulo';

function getLocalBusinessClock(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_HOURS_TIMEZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const weekday = parts.find(part => part.type === 'weekday')?.value;
  const hour = parts.find(part => part.type === 'hour')?.value || '00';
  const minute = parts.find(part => part.type === 'minute')?.value || '00';

  const weekdayMap = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    dayOfWeek: weekdayMap[weekday],
    currentTime: `${hour}:${minute}`,
    timezone: BUSINESS_HOURS_TIMEZONE,
  };
}

async function isWithinBusinessHours(tenantId) {
  const { dayOfWeek, currentTime, timezone } = getLocalBusinessClock();

  const hours = await prisma.businessHour.findUnique({
    where: {
      tenantId_dayOfWeek: { tenantId, dayOfWeek }
    }
  });

  // Sem configuração para o dia: mantém aberto por compatibilidade.
  if (!hours) return true;

  // Dia desativado significa fechado.
  if (!hours.active) return false;

  const isOpen = currentTime >= hours.start && currentTime <= hours.end;

  console.log(`[businessHours] tenant=${tenantId} tz=${timezone} day=${dayOfWeek} now=${currentTime} range=${hours.start}-${hours.end} open=${isOpen}`);

  return isOpen;
}

module.exports = { isWithinBusinessHours };
