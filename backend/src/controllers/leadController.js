const prisma = require('../lib/prisma');
const { scrapeGoogleMaps } = require('../services/scraperService');
const evolutionService = require('../services/evolutionService');

// POST /api/leads/search — Buscar leads no Google Maps
async function searchLeads(req, res) {
  try {
    const tenantId = req.user.tenantId;
    const { query, maxResults = 20 } = req.body;

    if (!query || query.trim().length < 3) {
      return res.status(400).json({ error: 'Informe uma busca válida (ex: "dentistas em São Paulo")' });
    }

    console.log(`[leads] Tenant ${tenantId} buscando: "${query}"`);
    
    const results = await scrapeGoogleMaps(query.trim(), Math.min(maxResults, 50));
    
    // Salva os leads no banco, evitando duplicatas por placeId
    let saved = 0;
    let skipped = 0;
    const savedLeads = [];

    for (const lead of results) {
      try {
        const existing = lead.placeId
          ? await prisma.lead.findUnique({
              where: { tenantId_placeId: { tenantId, placeId: lead.placeId } }
            })
          : null;

        if (existing) {
          // Atualiza dados se vier mais informação
          const updated = await prisma.lead.update({
            where: { id: existing.id },
            data: {
              phone: lead.phone || existing.phone,
              address: lead.address || existing.address,
              website: lead.website || existing.website,
              rating: lead.rating ?? existing.rating,
              category: lead.category || existing.category,
            }
          });
          savedLeads.push(updated);
          skipped++;
        } else {
          const created = await prisma.lead.create({
            data: {
              tenantId,
              placeId: lead.placeId || `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              name: lead.name,
              phone: lead.phone || null,
              address: lead.address || null,
              website: lead.website || null,
              rating: lead.rating || null,
              category: lead.category || null,
              query: query.trim(),
            }
          });
          savedLeads.push(created);
          saved++;
        }
      } catch (err) {
        console.warn(`[leads] Erro ao salvar lead "${lead.name}":`, err.message);
      }
    }

    console.log(`[leads] Resultado: ${saved} novos, ${skipped} atualizados`);
    res.json({
      message: `${saved} novos leads encontrados, ${skipped} já existentes atualizados.`,
      total: savedLeads.length,
      leads: savedLeads,
    });
  } catch (err) {
    console.error('[leads] Erro na busca:', err.message);
    res.status(500).json({ error: 'Erro ao buscar leads: ' + err.message });
  }
}

// GET /api/leads — Listar leads do tenant
async function getLeads(req, res) {
  try {
    const tenantId = req.user.tenantId;
    const { q, imported } = req.query;

    const where = { tenantId };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
        { query: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (imported !== undefined) {
      where.imported = imported === 'true';
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    res.json(leads);
  } catch (err) {
    console.error('[leads] Erro ao listar:', err.message);
    res.status(500).json({ error: 'Erro ao listar leads' });
  }
}

// DELETE /api/leads/:id — Deletar um lead
async function deleteLead(req, res) {
  try {
    const tenantId = req.user.tenantId;
    const lead = await prisma.lead.findFirst({ where: { id: req.params.id, tenantId } });
    if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });

    await prisma.lead.delete({ where: { id: lead.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('[leads] Erro ao deletar:', err.message);
    res.status(500).json({ error: 'Erro ao deletar lead' });
  }
}

// DELETE /api/leads — Deletar todos os leads do tenant
async function deleteAllLeads(req, res) {
  try {
    const tenantId = req.user.tenantId;
    const { count } = await prisma.lead.deleteMany({ where: { tenantId } });
    res.json({ ok: true, deleted: count });
  } catch (err) {
    console.error('[leads] Erro ao deletar todos:', err.message);
    res.status(500).json({ error: 'Erro ao deletar leads' });
  }
}

// POST /api/leads/send — Enviar WhatsApp em massa para leads selecionados
async function sendToLeads(req, res) {
  try {
    const tenantId = req.user.tenantId;
    const { leadIds, message, mediaUrl, mediaType } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'Selecione pelo menos um lead' });
    }
    if (!message && !mediaUrl) {
      return res.status(400).json({ error: 'Informe uma mensagem ou mídia para enviar' });
    }

    // Pega dados do tenant + instância
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { settings: true, instances: true }
    });

    if (!tenant?.settings?.evolutionUrl || !tenant?.settings?.evolutionKey) {
      return res.status(400).json({ error: 'Configure a Evolution API nas configurações antes de enviar' });
    }

    const instance = tenant.instances.find(i => i.status === 'connected') || tenant.instances[0];
    if (!instance) {
      return res.status(400).json({ error: 'Nenhuma instância WhatsApp conectada' });
    }

    // Busca leads selecionados
    const leads = await prisma.lead.findMany({
      where: { id: { in: leadIds }, tenantId }
    });

    const leadsWithPhone = leads.filter(l => l.phone);
    if (leadsWithPhone.length === 0) {
      return res.status(400).json({ error: 'Nenhum lead selecionado possui telefone' });
    }

    let sent = 0;
    let failed = 0;
    const errors = [];

    for (const lead of leadsWithPhone) {
      try {
        const phone = lead.phone.replace(/\D/g, '');
        if (phone.length < 10) {
          failed++;
          continue;
        }

        if (mediaUrl && mediaType) {
          // Enviar mídia + caption
          const path = require('path');
          const fullPath = path.resolve(__dirname, '../../', mediaUrl);
          await evolutionService.sendMedia(
            tenant.settings.evolutionUrl,
            tenant.settings.evolutionKey,
            instance.instanceName,
            phone,
            {
              mediatype: mediaType === 'image' ? 'image' : 'document',
              mimetype: mediaType === 'image' ? 'image/jpeg' : 'application/octet-stream',
              caption: message || '',
              filePath: fullPath,
              filename: path.basename(mediaUrl),
            }
          );
        } else {
          // Enviar somente texto
          await evolutionService.sendText(
            tenant.settings.evolutionUrl,
            tenant.settings.evolutionKey,
            instance.instanceName,
            phone,
            message
          );
        }

        sent++;

        // Delay entre envios para evitar ban
        await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));
      } catch (err) {
        failed++;
        errors.push(`${lead.name}: ${err.message}`);
        console.warn(`[leads] Falha ao enviar para ${lead.name}:`, err.message);
      }
    }

    console.log(`[leads] Envio finalizado: ${sent} enviados, ${failed} falhas`);
    res.json({
      message: `${sent} mensagens enviadas com sucesso. ${failed} falharam.`,
      sent,
      failed,
      errors: errors.slice(0, 5), // Limita erros retornados
    });
  } catch (err) {
    console.error('[leads] Erro no envio em massa:', err.message);
    res.status(500).json({ error: 'Erro ao enviar mensagens: ' + err.message });
  }
}

module.exports = { searchLeads, getLeads, deleteLead, deleteAllLeads, sendToLeads };
