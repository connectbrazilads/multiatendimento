const prisma = require('../lib/prisma');
const evolutionService = require('../services/evolutionService');
const {
  fetchCompanyContacts,
  normalizeRemoteContact,
  pingCompanyApi,
} = require('../services/companyApiService');

function buildContactWhere(tenantId, phone, cpfCnpj) {
  const phoneCandidates = evolutionService.buildPhoneLookupCandidates(phone);
  const or = [];

  if (phoneCandidates.length > 0) {
    or.push({ phone: { in: phoneCandidates } });
    or.push({ whatsapp: { in: phoneCandidates } });
  }

  if (cpfCnpj) {
    or.push({ cpfCnpj });
  }

  return { tenantId, OR: or };
}

async function resolveTenantInstance(tenantId) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { instances: true },
  });

  if (!tenant) {
    throw new Error('Tenant nao encontrado.');
  }

  const instance =
    tenant.instances.find((item) => String(item.status).toLowerCase() === 'connected') ||
    tenant.instances[0];

  if (!instance) {
    throw new Error('Nenhuma instancia de WhatsApp encontrada para este tenant.');
  }

  return { tenant, instance };
}

async function testFirebirdConnection(req, res) {
  try {
    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId: req.user.tenantId },
    });

    // Se possui Token do Agent configurado mas não tem URL de API (modo Agent local)
    if (settings?.firebirdClientToken && !settings?.firebirdApiUrl) {
      if (!settings.firebirdLastSyncAt) {
        return res.json({
          ok: true,
          agentMode: true,
          message: 'Modo Agent configurado. Aguardando o primeiro envio de dados do Agent para confirmar a conexão.',
        });
      }

      const diffMs = new Date() - new Date(settings.firebirdLastSyncAt);
      const diffMinutes = Math.floor(diffMs / 1000 / 60);

      if (diffMinutes <= 15) {
        return res.json({
          ok: true,
          agentMode: true,
          message: `Conexão com o Agent ativa. Último envio recebido há ${diffMinutes} minutos.`,
        });
      } else {
        return res.json({
          ok: true,
          agentMode: true,
          message: `O Agent está configurado, mas não envia dados há mais de 15 minutos (último envio: ${new Date(settings.firebirdLastSyncAt).toLocaleString('pt-BR')}). Verifique se o agent está rodando no servidor local.`,
        });
      }
    }

    if (!settings?.firebirdApiUrl) {
      return res.status(400).json({ error: 'Configure a URL da API da empresa antes de testar a conexao.' });
    }

    const data = await pingCompanyApi(settings);
    res.json({
      ok: true,
      message: 'Conexao com a API da empresa confirmada.',
      data,
    });
  } catch (err) {
    console.error('[integration] erro no teste:', err.message);
    res.status(500).json({ error: `Falha ao testar a API da empresa: ${err.message}` });
  }
}

async function syncFirebirdContacts(req, res) {
  const tenantId = req.user.tenantId;
  const startedAt = new Date();

  try {
    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId },
    });

    if (!settings?.firebirdApiUrl) {
      return res.status(400).json({ error: 'Configure a URL da API da empresa antes de sincronizar.' });
    }

    if (!settings.firebirdSyncEnabled && !req.body?.force) {
      return res.status(400).json({ error: 'A sincronizacao esta desativada nas configuracoes.' });
    }

    await prisma.tenantSettings.update({
      where: { tenantId },
      data: {
        firebirdLastSyncStatus: 'syncing',
        firebirdLastSyncError: null,
      },
    });

    const since = req.body?.since || settings.firebirdLastSyncAt || null;
    const limit = Number(req.body?.limit || 200);
    const remoteContacts = await fetchCompanyContacts(settings, {
      updatedSince: since,
      limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 1000) : 200,
    });

    const { instance } = await resolveTenantInstance(tenantId);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let equipmentCreated = 0;
    const errors = [];

    for (const remote of remoteContacts) {
      const data = normalizeRemoteContact(remote);
      if (!data?.phone) {
        skipped++;
        continue;
      }

      const phone = evolutionService.normalizePhoneNumber(data.phone);
      if (!phone) {
        skipped++;
        continue;
      }

      try {
        const existing = await prisma.contact.findFirst({
          where: buildContactWhere(tenantId, phone, data.cpfCnpj || null),
        });

        let contact;
        if (existing) {
          contact = await prisma.contact.update({
            where: { id: existing.id },
            data: {
              phone,
              name: data.name || existing.name,
              fantasyName: data.fantasyName || existing.fantasyName,
              email: data.email || existing.email,
              cpfCnpj: data.cpfCnpj || existing.cpfCnpj,
              address: data.address || existing.address,
              city: data.city || existing.city,
              state: data.state || existing.state,
              zipCode: data.zipCode || existing.zipCode,
              instanceId: existing.instanceId || instance.id,
            },
          });
          updated++;
        } else {
          contact = await prisma.contact.create({
            data: {
              tenantId,
              instanceId: instance.id,
              phone,
              name: data.name || null,
              fantasyName: data.fantasyName || null,
              email: data.email || null,
              cpfCnpj: data.cpfCnpj || null,
              address: data.address || null,
              city: data.city || null,
              state: data.state || null,
              zipCode: data.zipCode || null,
            },
          });
          created++;
        }

        if (data.equipment?.model) {
          const existingEquipment = await prisma.equipment.findFirst({
            where: {
              contactId: contact.id,
              model: String(data.equipment.model),
              serialNumber: data.equipment.serialNumber ? String(data.equipment.serialNumber) : null,
            },
          });

          if (!existingEquipment) {
            await prisma.equipment.create({
              data: {
                tenantId,
                contactId: contact.id,
                manufacturer: data.equipment.manufacturer || null,
                model: String(data.equipment.model),
                serialNumber: data.equipment.serialNumber || null,
                type: data.equipment.type || null,
                sector: data.equipment.sector || null,
                address: data.equipment.address || null,
              },
            });
            equipmentCreated++;
          }
        }
      } catch (err) {
        errors.push(`${data.name || phone}: ${err.message}`);
      }
    }

    const finishedAt = new Date();
    await prisma.tenantSettings.update({
      where: { tenantId },
      data: {
        firebirdLastSyncAt: finishedAt,
        firebirdLastSyncStatus: errors.length > 0 ? 'partial' : 'ok',
        firebirdLastSyncError: errors.length > 0 ? errors.slice(0, 20).join('\n') : null,
      },
    });

    res.json({
      ok: true,
      created,
      updated,
      skipped,
      equipmentCreated,
      total: remoteContacts.length,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      errors: errors.slice(0, 10),
    });
  } catch (err) {
    console.error('[integration] erro na sincronizacao:', err.message);

    try {
      await prisma.tenantSettings.update({
        where: { tenantId },
        data: {
          firebirdLastSyncStatus: 'error',
          firebirdLastSyncError: err.message,
        },
      });
    } catch (_) {
      // Se falhar ao registrar o erro, seguimos com a resposta original.
    }

    res.status(500).json({ error: `Falha ao sincronizar a API da empresa: ${err.message}` });
  }
}

module.exports = {
  syncFirebirdContacts,
  testFirebirdConnection,
};
