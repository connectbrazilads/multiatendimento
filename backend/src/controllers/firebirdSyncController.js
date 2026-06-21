const crypto = require('crypto');
const prisma = require('../lib/prisma');
const evolutionService = require('../services/evolutionService');
const { mapEquipmentType } = require('../utils/equipmentMapper');

function pick(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return null;
}

function normalizeDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;

  const text = String(value).trim();
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})/);
  if (!match) return null;

  const [, dd, mm, yyyy, hh, mi, ss] = match;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(mi), Number(ss));
}

function normalizePhone(value, fallback) {
  const phone = evolutionService.normalizePhoneNumber(value);
  if (phone) return phone;
  return fallback ? `FB-${fallback}` : null;
}

function normalizeStatus(value) {
  const text = pick(value)?.toUpperCase() || '';

  if (text.includes('CONCLU') || text.includes('FINALIZ')) return 'FINALIZADA';
  if (text.includes('AGUARD')) return 'AGUARDANDO_RETORNO';
  if (text.includes('ATEND')) return 'EM_ATENDIMENTO';
  return 'PENDENTE';
}

async function resolveTenantContext(tenantSlug) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    include: { settings: true, instances: true },
  });

  if (!tenant) {
    throw new Error('Tenant não encontrado para o slug informado.');
  }

  const instance =
    tenant.instances.find((item) => String(item.status).toLowerCase() === 'connected') ||
    tenant.instances[0];

  if (!instance) {
    throw new Error('Nenhuma instância de WhatsApp encontrada para esse tenant.');
  }

  return { tenant, instance };
}

function resolveToken(tenant) {
  return tenant?.settings?.firebirdClientToken || process.env.FIREBIRD_SYNC_TOKEN || '';
}

function assertToken(req, tenant) {
  const expected = resolveToken(tenant);
  const provided = req.header('x-firebird-token') || req.header('authorization')?.replace(/^Bearer\s+/i, '');

  if (!expected) {
    throw new Error('Token de sincronização não configurado no CRM.');
  }

  if (!provided || provided !== expected) {
    throw new Error('Token de sincronização inválido.');
  }
}

async function upsertRawRecord(tenantId, source, entity, externalId, payload) {
  const safeExternalId = externalId || crypto.randomUUID();
  await prisma.externalSyncRecord.upsert({
    where: {
      tenantId_source_entity_externalId: {
        tenantId,
        source,
        entity,
        externalId: safeExternalId,
      },
    },
    update: {
      payload,
      syncedAt: new Date(),
    },
    create: {
      tenantId,
      source,
      entity,
      externalId: safeExternalId,
      payload,
      syncedAt: new Date(),
    },
  });
  return safeExternalId;
}

async function findOrCreateContact(tenant, instance, data) {
  const externalId = pick(data.externalId, data.cdCliente, data.clientExternalId, data.clientId);
  const externalSource = 'firebird';

  if (!externalId) {
    throw new Error('Contato sem identificador externo.');
  }

  const phone = normalizePhone(
    pick(data.phone, data.fone1, data.celular, data.whatsapp, data.fone2, data.telefone),
    externalId
  );

  const defaults = {
    tenantId: tenant.id,
    instanceId: instance.id,
    externalSource,
    externalId,
    externalUpdatedAt: normalizeDate(pick(data.updatedAt, data.atualizado, data.modificadoEm, data.inclusao)),
    phone: phone || `FB-${externalId}`,
    name: pick(data.name, data.nmCliente, data.razaoSocial, data.cliente) || `Cliente ${externalId}`,
    fantasyName: pick(data.fantasyName, data.fantasia, data.nomeFantasia),
    email: pick(data.email),
    cpfCnpj: pick(data.cpfCnpj, data.cpf, data.cnpj, data.documento),
    address: pick(data.address, data.endereco, data.logradouro),
    city: pick(data.city, data.cidade),
    state: pick(data.state, data.uf),
    zipCode: pick(data.zipCode, data.cep),
    notes: pick(data.obs, data.observacao, data.contato) || null,
  };

  const existing = await prisma.contact.findFirst({
    where: {
      tenantId: tenant.id,
      externalSource,
      externalId,
    },
  });

  if (existing) {
    return prisma.contact.update({
      where: { id: existing.id },
      data: {
        ...defaults,
        phone: defaults.phone || existing.phone,
        name: defaults.name || existing.name,
        fantasyName: defaults.fantasyName || existing.fantasyName,
        email: defaults.email || existing.email,
        cpfCnpj: defaults.cpfCnpj || existing.cpfCnpj,
        address: defaults.address || existing.address,
        city: defaults.city || existing.city,
        state: defaults.state || existing.state,
        zipCode: defaults.zipCode || existing.zipCode,
        notes: defaults.notes || existing.notes,
      },
    });
  }

  return prisma.contact.create({ data: defaults });
}

async function upsertCrmCustomer(tenant, data) {
  const externalId = pick(data.externalId, data.cdCliente, data.clientExternalId, data.clientId);
  if (!externalId) {
    throw new Error('Cliente CRM sem identificador externo.');
  }

  const phone = normalizePhone(
    pick(data.phone, data.fone1, data.celular, data.whatsapp, data.fone2, data.telefone),
    null
  );

  const defaults = {
    tenantId: tenant.id,
    externalSource: 'firebird',
    externalId,
    externalUpdatedAt: normalizeDate(pick(data.updatedAt, data.atualizado, data.modificadoEm, data.inclusao)),
    name: pick(data.name, data.nmCliente, data.razaoSocial, data.cliente) || `Cliente ${externalId}`,
    fantasyName: pick(data.fantasyName, data.fantasia, data.nomeFantasia),
    cpfCnpj: pick(data.cpfCnpj, data.cpf, data.cnpj, data.documento),
    email: pick(data.email),
    phone,
    address: pick(data.address, data.endereco, data.logradouro),
    neighborhood: pick(data.neighborhood, data.bairro),
    city: pick(data.city, data.cidade),
    state: pick(data.state, data.uf),
    zipCode: pick(data.zipCode, data.cep),
    contactName: pick(data.contact, data.contato),
    notes: pick(data.obs, data.observacao),
    raw: data.raw || data,
  };

  return prisma.crmCustomer.upsert({
    where: {
      tenantId_externalSource_externalId: {
        tenantId: tenant.id,
        externalSource: 'firebird',
        externalId,
      },
    },
    update: defaults,
    create: defaults,
  });
}

async function upsertCrmEquipment(tenant, data) {
  const externalId = pick(data.externalId, data.cdequipamento, data.equipmentExternalId);
  const clientExternalId = pick(data.clientExternalId, data.cdCliente, data.clientId);
  if (!externalId) {
    throw new Error('Equipamento CRM sem identificador externo.');
  }

  let customer = null;
  if (clientExternalId) {
    customer = await prisma.crmCustomer.findFirst({
      where: {
        tenantId: tenant.id,
        externalSource: 'firebird',
        externalId: clientExternalId,
      },
    });
  }

  const defaults = {
    tenantId: tenant.id,
    customerId: customer?.id || null,
    externalSource: 'firebird',
    externalId,
    externalUpdatedAt: normalizeDate(pick(data.updatedAt, data.atualizado, data.inclusao)),
    model: pick(data.model, data.modelo, data.equipmentModel) || `Equipamento ${externalId}`,
    manufacturer: pick(data.manufacturer, data.fabricante),
    type: mapEquipmentType(pick(data.type, data.tipo, data.cdProduto), pick(data.model, data.modelo, data.equipmentModel)),
    serialNumber: pick(data.serialNumber, data.serie, data.sn),
    assetTag: pick(data.assetTag, data.patrimonio),
    sector: pick(data.sector, data.departamento),
    installLocation: pick(data.installLocation, data.localInstal, data.localinstal),
    address: pick(data.address, data.endereco),
    city: pick(data.city, data.cidade),
    state: pick(data.state, data.uf),
    phone: normalizePhone(pick(data.phone, data.fone, data.celular, data.whatsapp), null),
    contractExternalId: pick(data.contractExternalId, data.seqContrato, data.seqcontrato),
    isActive: !['S', 'SIM', 'TRUE', '1'].includes(String(pick(data.inactive, data.tfinativo) || '').toUpperCase()),
    raw: data.raw || data,
  };

  return prisma.crmEquipment.upsert({
    where: {
      tenantId_externalSource_externalId: {
        tenantId: tenant.id,
        externalSource: 'firebird',
        externalId,
      },
    },
    update: defaults,
    create: defaults,
  });
}

async function findOrCreateEquipment(tenant, instance, data) {
  const externalId = pick(data.externalId, data.cdequipamento, data.equipmentExternalId, data.seqOs);
  const clientExternalId = pick(data.clientExternalId, data.cdCliente, data.clientId);

  if (!externalId) {
    throw new Error('Equipamento sem identificador externo.');
  }

  const contact = await findOrCreateContact(tenant, instance, {
    externalId: clientExternalId || `EQUIP-${externalId}`,
    cdCliente: clientExternalId || `EQUIP-${externalId}`,
    name: pick(data.clientName, data.nmCliente, data.nomeCliente) || `Cliente ${clientExternalId || externalId}`,
    phone: pick(data.phone, data.fone, data.celular, data.whatsapp),
    city: pick(data.city, data.cidade),
    state: pick(data.state, data.uf),
  });

  const defaults = {
    tenantId: tenant.id,
    contactId: contact.id,
    externalSource: 'firebird',
    externalId,
    externalUpdatedAt: normalizeDate(pick(data.updatedAt, data.atualizado, data.inclusao)),
    manufacturer: pick(data.manufacturer, data.fabricante),
    model: pick(data.model, data.modelo) || `Equipamento ${externalId}`,
    serialNumber: pick(data.serialNumber, data.serie, data.sn),
    type: mapEquipmentType(pick(data.type, data.tipo, data.cdProduto), pick(data.model, data.modelo)),
    sector: pick(data.sector, data.departamento, data.localInstal),
    address: pick(data.address, data.endereco),
  };

  const existing = await prisma.equipment.findFirst({
    where: {
      tenantId: tenant.id,
      externalSource: 'firebird',
      externalId,
    },
  });

  if (existing) {
    return prisma.equipment.update({
      where: { id: existing.id },
      data: {
        ...defaults,
        contactId: contact.id,
        manufacturer: defaults.manufacturer || existing.manufacturer,
        model: defaults.model || existing.model,
        serialNumber: defaults.serialNumber || existing.serialNumber,
        type: defaults.type || existing.type,
        sector: defaults.sector || existing.sector,
        address: defaults.address || existing.address,
      },
    });
  }

  return prisma.equipment.create({ data: defaults });
}

async function upsertServiceOrder(tenant, instance, data) {
  const externalId = pick(data.externalId, data.seqOs, data.idAtendimento, data.id_atendimento);

  if (!externalId) {
    throw new Error('Ordem de serviço sem identificador externo.');
  }

  const contact = await findOrCreateContact(tenant, instance, {
    externalId: pick(data.clientExternalId, data.cdCliente, data.clientId) || `OS-${externalId}`,
    cdCliente: pick(data.clientExternalId, data.cdCliente, data.clientId) || `OS-${externalId}`,
    name: pick(data.clientName, data.nmCliente) || `Cliente ${pick(data.clientExternalId, data.cdCliente, data.clientId) || externalId}`,
    phone: pick(data.phone, data.fone, data.celular, data.whatsapp),
    address: pick(data.address, data.endereco),
    city: pick(data.city, data.cidade),
    state: pick(data.state, data.uf),
    zipCode: pick(data.zipCode, data.cep),
  });

  const equipment = await findOrCreateEquipment(tenant, instance, {
    externalId: pick(data.equipmentExternalId, data.cdequipamento) || `EQ-${externalId}`,
    clientExternalId: pick(data.clientExternalId, data.cdCliente, data.clientId) || `OS-${externalId}`,
    clientName: pick(data.clientName, data.nmCliente) || contact.name,
    manufacturer: pick(data.manufacturer, data.fabricante),
    model: pick(data.equipmentModel, data.modele, data.modeloe, data.modelo) || `Equipamento ${externalId}`,
    serialNumber: pick(data.serialNumber, data.serie),
    type: pick(data.type, data.tipo, data.cdProduto),
    sector: pick(data.sector, data.departamento, data.localInstal),
    address: pick(data.address, data.endereco),
    city: pick(data.city, data.cidade),
    state: pick(data.state, data.uf),
  });

  const defaults = {
    tenantId: tenant.id,
    contactId: contact.id,
    equipmentId: equipment.id,
    externalSource: 'firebird',
    externalId,
    externalUpdatedAt: normalizeDate(pick(data.updatedAt, data.atualizado, data.dtAtendimento, data.dtatendimento)),
    status: normalizeStatus(pick(data.status, data.nmStatus, data.tffaturar)),
    defect: pick(data.defect, data.nmDefeito, data.causa, data.sintoma),
    technicalNotes: [pick(data.action, data.acao), pick(data.observacao), pick(data.nmSuporteT)].filter(Boolean).join(' | ') || null,
    resolvedAt: normalizeDate(pick(data.resolvedAt, data.dtAtendimento, data.dtatendimento)),
  };

  const existing = await prisma.serviceOrder.findFirst({
    where: {
      tenantId: tenant.id,
      externalSource: 'firebird',
      externalId,
    },
  });

  if (existing) {
    return prisma.serviceOrder.update({
      where: { id: existing.id },
      data: {
        ...defaults,
        contactId: contact.id,
        equipmentId: equipment.id,
        status: defaults.status || existing.status,
        defect: defaults.defect || existing.defect,
        technicalNotes: defaults.technicalNotes || existing.technicalNotes,
        resolvedAt: defaults.resolvedAt || existing.resolvedAt,
      },
    });
  }

  return prisma.serviceOrder.create({ data: defaults });
}

async function pushBatch(req, res) {
  try {
    const { tenantSlug, entity, records } = req.body || {};

    if (!tenantSlug) {
      return res.status(400).json({ error: 'tenantSlug é obrigatório.' });
    }

    if (!entity || typeof entity !== 'string') {
      return res.status(400).json({ error: 'entity é obrigatório.' });
    }

    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'records deve ser uma lista.' });
    }

    const { tenant, instance } = await resolveTenantContext(tenantSlug);
    assertToken(req, tenant);

    const source = 'firebird';
    const stats = {
      received: records.length,
      stored: 0,
      crmCustomers: 0,
      crmEquipments: 0,
      contacts: 0,
      equipments: 0,
      serviceOrders: 0,
      skipped: 0,
      errors: [],
    };

    for (const record of records) {
      try {
        const externalId = pick(
          record.externalId,
          record.cdCliente,
          record.cdequipamento,
          record.seqOs,
          record.idAtendimento,
          record.id_atendimento,
          record.code,
          record.cdOstp,
          record.name,
          record.nmSuporte,
          record.nmsuporte
        ) || crypto.randomUUID();

        await upsertRawRecord(tenant.id, source, entity, externalId, record);
        stats.stored += 1;

        if (entity === 'contacts') {
          await upsertCrmCustomer(tenant, record);
          stats.crmCustomers += 1;
        } else if (entity === 'equipments') {
          await upsertCrmEquipment(tenant, record);
          stats.crmEquipments += 1;
        } else if (entity === 'osTypes') {
          await upsertCrmOsType(tenant, record);
        } else if (entity === 'technicians') {
          await upsertCrmTechnician(tenant, record);
        } else if (entity === 'serviceOrders') {
          stats.skipped += 1;
        } else {
          stats.skipped += 1;
        }
      } catch (err) {
        stats.errors.push(err.message);
      }
    }

    await prisma.tenantSettings.update({
      where: { tenantId: tenant.id },
      data: {
        firebirdLastSyncAt: new Date(),
        firebirdLastSyncStatus: stats.errors.length ? 'partial' : 'ok',
        firebirdLastSyncError: stats.errors.length ? stats.errors.slice(0, 20).join('\n') : null,
      },
    });

    res.json({
      ok: true,
      tenant: tenant.slug,
      entity,
      stats,
    });
  } catch (err) {
    console.error('[firebird-sync] erro:', err.message);
    res.status(500).json({ error: err.message });
  }
}

async function upsertCrmOsType(tenant, data) {
  const code = pick(data.code, data.cdOstp, data.cdostp);
  const name = pick(data.name, data.nmOstp, data.nmostp);
  if (!code || !name) {
    throw new Error('Tipo de O.S. sem código ou descrição.');
  }

  return prisma.crmOsType.upsert({
    where: {
      tenantId_code: {
        tenantId: tenant.id,
        code,
      },
    },
    update: { name },
    create: {
      tenantId: tenant.id,
      code,
      name,
    },
  });
}

async function upsertCrmTechnician(tenant, data) {
  const name = pick(data.name, data.nmSuporte, data.nmsuporte);
  if (!name) {
    throw new Error('Técnico sem nome.');
  }

  const isActive = !['S', 'SIM', 'TRUE', '1'].includes(String(pick(data.inactive, data.tfinativo, data.tfativo === 'N') || '').toUpperCase());

  return prisma.crmTechnician.upsert({
    where: {
      tenantId_name: {
        tenantId: tenant.id,
        name,
      },
    },
    update: { isActive },
    create: {
      tenantId: tenant.id,
      name,
      isActive,
    },
  });
}

async function getPendingCommands(req, res) {
  try {
    const { tenantSlug } = req.query;
    if (!tenantSlug) {
      return res.status(400).json({ error: 'tenantSlug é obrigatório.' });
    }
    const { tenant } = await resolveTenantContext(tenantSlug);
    assertToken(req, tenant);

    const pendingOS = await prisma.serviceOrder.findMany({
      where: {
        tenantId: tenant.id,
        externalSource: 'firebird',
        externalId: null,
      },
      include: {
        contact: {
          include: {
            crmCustomer: true,
          },
        },
        equipment: true,
        user: true,
      },
    });

    const equipmentExternalIds = pendingOS.map(os => os.equipment.externalId).filter(Boolean);
    const crmEquipments = await prisma.crmEquipment.findMany({
      where: {
        tenantId: tenant.id,
        externalId: { in: equipmentExternalIds }
      }
    });
    const crmEquipMap = new Map(crmEquipments.map(e => [e.externalId, e]));

    const commands = pendingOS.map((os) => {
      const crmEq = crmEquipMap.get(os.equipment.externalId);
      return {
      id: os.id,
      type: 'CREATE_OS',
      payload: {
        cdCliente: os.contact.externalId || os.contact.crmCustomer?.externalId || null,
        cdEquipamento: os.equipment.externalId,
        cdOstp: os.cdOstp || '02',
        nmsuportet: os.nmsuportet || '',
        defect: os.defect || '',
        attendantName: os.user?.firebirdSupportName || os.user?.name || '',
        // duplicados do cliente
        nmCliente: os.contact.crmCustomer?.name || os.contact.name || '',
        endereco: os.contact.crmCustomer?.address || os.contact.address || '',
        num: os.contact.crmCustomer?.raw?.['num'] || os.contact.crmCustomer?.raw?.['NUM'] || '',
        bairro: os.contact.crmCustomer?.neighborhood || os.contact.neighborhood || '',
        complemento: os.contact.crmCustomer?.raw?.['complemento'] || os.contact.crmCustomer?.raw?.['COMPLEMENTO'] || '',
        city: os.contact.crmCustomer?.city || os.contact.city || '',
        state: os.contact.crmCustomer?.state || os.contact.state || '',
        zipCode: os.contact.crmCustomer?.zipCode || os.contact.zipCode || '',
        ddd: os.contact.crmCustomer?.raw?.['ddd'] || os.contact.crmCustomer?.raw?.['DDD'] || '',
        phone: os.contact.crmCustomer?.phone || os.contact.phone || '',
        celular: os.contact.crmCustomer?.raw?.['celular'] || os.contact.crmCustomer?.raw?.['CELULAR'] || '',
        email: os.contact.crmCustomer?.email || os.contact.email || '',
        contato: os.contact.crmCustomer?.contactName || os.contact.name || '',
        // duplicados do equipamento
        departamento: crmEq?.raw?.['departamento'] || crmEq?.raw?.['DEPARTAMENTO'] || os.equipment.sector || '',
        localInstal: crmEq?.raw?.['localinstal'] || crmEq?.raw?.['LOCALINSTAL'] || crmEq?.installLocation || '',
      },
    };
    });

    if (tenant.settings?.firebirdQueueBillingProcess) {
      commands.push({
        id: 'PROCESS_BILLING',
        type: 'PROCESS_BILLING',
        payload: {}
      });
    }

    res.json(commands);
  } catch (err) {
    console.error('[pending-commands] erro:', err.message);
    res.status(500).json({ error: err.message });
  }
}

async function commandCallback(req, res) {
  try {
    const { id } = req.params;
    const { tenantSlug, success, result, error } = req.body || {};

    if (!tenantSlug) {
      return res.status(400).json({ error: 'tenantSlug é obrigatório.' });
    }
    const { tenant } = await resolveTenantContext(tenantSlug);
    assertToken(req, tenant);

    if (id === 'PROCESS_BILLING') {
      await prisma.tenantSettings.update({
        where: { tenantId: tenant.id },
        data: { firebirdQueueBillingProcess: false }
      });
      console.log(`[pending-commands] Comando PROCESS_BILLING concluído.`);
      return res.json({ ok: true });
    }

    if (success && result?.seqOs) {
      await prisma.serviceOrder.update({
        where: { id, tenantId: tenant.id },
        data: {
          externalId: String(result.seqOs),
        },
      });
      console.log(`[pending-commands] OS ${id} associada ao SEQOS ${result.seqOs} com sucesso.`);
    } else {
      console.warn(`[pending-commands] Falha ao processar comando OS ${id}:`, error);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[pending-commands-callback] erro:', err.message);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  pushBatch,
  getPendingCommands,
  commandCallback,
};
