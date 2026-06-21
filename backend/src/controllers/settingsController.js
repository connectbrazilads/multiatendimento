const prisma = require('../lib/prisma');

async function getSettings(req, res) {
  const settings = await prisma.tenantSettings.findUnique({
    where: { tenantId: req.user.tenantId },
  });

  if (!settings) return res.json({
    evolutionUrl: process.env.DEFAULT_EVOLUTION_URL || '',
    evolutionKey: process.env.DEFAULT_EVOLUTION_KEY || '',
  });

  // Injeta os padrões do servidor se o tenant não tiver configurado
  res.json({
    ...settings,
    evolutionUrl: settings.evolutionUrl || process.env.DEFAULT_EVOLUTION_URL || '',
    evolutionKey: settings.evolutionKey || process.env.DEFAULT_EVOLUTION_KEY || '',
    systemPrompt: settings.botSystemPrompt,
    transferKeyword: settings.botTransferWord,
    outOfOfficeMessage: settings.outOfOfficeMessage
  });
}

async function saveSettings(req, res) {
  const { 
    botEnabled, geminiKey, botName, systemPrompt, transferKeyword, 
    evolutionUrl, evolutionKey, webhookUrl, outOfOfficeMessage,
    ratingEnabled, ratingMessage, notificationPhone,
    companyName, companyCnpj, companyIE, companyAddress, companyBairro, companyCep, companyPhone,
    companyCity, companyState,
    serpApiKey,
    firebirdClientToken,
    firebirdApiUrl,
    firebirdApiKey,
    firebirdAuthMode,
    firebirdHealthPath,
    firebirdContactsPath,
    firebirdSyncEnabled,
    firebirdLastSyncAt,
    firebirdLastSyncStatus,
    firebirdLastSyncError,
    kpiContractValue, kpiServiceValue, kpiSlaLimitHours,
    billingMessageTemplate
  } = req.body;

  const parsedContractValue = kpiContractValue !== undefined && kpiContractValue !== '' ? parseFloat(kpiContractValue) : null;
  const parsedServiceValue = kpiServiceValue !== undefined && kpiServiceValue !== '' ? parseFloat(kpiServiceValue) : null;
  const parsedSlaLimitHours = kpiSlaLimitHours !== undefined && kpiSlaLimitHours !== '' ? parseInt(kpiSlaLimitHours) : null;

  const settings = await prisma.tenantSettings.upsert({
    where: { tenantId: req.user.tenantId },
    update: { 
      botEnabled, 
      geminiKey,
      botName,
      botSystemPrompt: systemPrompt,
      botTransferWord: transferKeyword,
      evolutionUrl,
      evolutionKey,
      webhookUrl,
      outOfOfficeMessage,
      ratingEnabled,
      ratingMessage,
      notificationPhone,
      companyName,
      companyCnpj,
      companyIE,
      companyAddress,
      companyBairro,
      companyCep,
      companyPhone,
      companyCity,
      companyState,
      serpApiKey,
      firebirdClientToken,
      firebirdApiUrl,
      firebirdApiKey,
      firebirdAuthMode,
      firebirdHealthPath,
      firebirdContactsPath,
      firebirdSyncEnabled,
      firebirdLastSyncAt: firebirdLastSyncAt ? new Date(firebirdLastSyncAt) : undefined,
      firebirdLastSyncStatus,
      firebirdLastSyncError,
      kpiContractValue: parsedContractValue,
      kpiServiceValue: parsedServiceValue,
      kpiSlaLimitHours: parsedSlaLimitHours,
      billingMessageTemplate
    },
    create: { 
      tenantId: req.user.tenantId, 
      botEnabled, 
      geminiKey,
      botName,
      botSystemPrompt: systemPrompt,
      botTransferWord: transferKeyword,
      evolutionUrl,
      evolutionKey,
      webhookUrl,
      outOfOfficeMessage,
      ratingEnabled,
      ratingMessage,
      notificationPhone,
      companyName,
      companyCnpj,
      companyIE,
      companyAddress,
      companyBairro,
      companyCep,
      companyPhone,
      companyCity,
      companyState,
      serpApiKey,
      firebirdClientToken,
      firebirdApiUrl,
      firebirdApiKey,
      firebirdAuthMode,
      firebirdHealthPath,
      firebirdContactsPath,
      firebirdSyncEnabled,
      firebirdLastSyncAt: firebirdLastSyncAt ? new Date(firebirdLastSyncAt) : undefined,
      firebirdLastSyncStatus,
      firebirdLastSyncError,
      kpiContractValue: parsedContractValue,
      kpiServiceValue: parsedServiceValue,
      kpiSlaLimitHours: parsedSlaLimitHours,
      billingMessageTemplate
    },
  });

  res.json(settings);
}

async function getBusinessHours(req, res) {
  const hours = await prisma.businessHour.findMany({
    where: { tenantId: req.user.tenantId },
    orderBy: { dayOfWeek: 'asc' }
  });
  res.json(hours);
}

async function saveBusinessHours(req, res) {
  const { hours } = req.body;
  
  await Promise.all(hours.map(h => 
    prisma.businessHour.upsert({
      where: { tenantId_dayOfWeek: { tenantId: req.user.tenantId, dayOfWeek: h.dayOfWeek } },
      update: { start: h.start, end: h.end, active: h.active },
      create: { tenantId: req.user.tenantId, dayOfWeek: h.dayOfWeek, start: h.start, end: h.end, active: h.active }
    })
  ));
  
  res.json({ ok: true });
}

async function uploadLogo(req, res) {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  
  const url = `/uploads/${req.file.filename}`;
  
  await prisma.tenant.update({
    where: { id: req.user.tenantId },
    data: { logoUrl: url }
  });
  
  res.json({ url });
}

module.exports = { getSettings, saveSettings, getBusinessHours, saveBusinessHours, uploadLogo };
