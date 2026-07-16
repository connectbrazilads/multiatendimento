const prisma = require('../lib/prisma');
const { scrapeGoogleMaps } = require('../services/scraperService');
const evolutionService = require('../services/evolutionService');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeLeadPhone(phone) {
  return evolutionService.normalizePhoneNumber(phone || '');
}

function randomDelayMs(minSeconds = 2, maxSeconds = 5) {
  const min = Math.max(0, Number(minSeconds) || 0);
  const max = Math.max(min, Number(maxSeconds) || min);
  return Math.round((min + Math.random() * (max - min)) * 1000);
}

// POST /api/leads/search — Buscar leads no Google Maps
async function searchLeads(req, res) {
  try {
    const tenantId = req.user.tenantId;
    const { query, maxResults = 20 } = req.body;

    if (!query || query.trim().length < 3) {
      return res.status(400).json({ error: 'Informe uma busca válida (ex: "dentistas em São Paulo")' });
    }

    // Pega a chave SerpAPI das settings do tenant ou variável de ambiente global
    const settings = await prisma.tenantSettings.findUnique({ where: { tenantId } });
    const apiKey = settings?.serpApiKey || process.env.SERPAPI_KEY;

    if (!apiKey) {
      return res.status(400).json({ 
        error: 'Chave SerpAPI não configurada. Vá em Ajustes e preencha o campo "Chave SerpAPI" ou defina a variável de ambiente SERPAPI_KEY.' 
      });
    }

    console.log(`[leads] Tenant ${tenantId} buscando: "${query}"`);
    
    const results = await scrapeGoogleMaps(query.trim(), apiKey, Math.min(maxResults, 50));
    
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

async function getLeadInstances(req, res) {
  try {
    const tenantId = req.user.tenantId;
    const instances = await prisma.waInstance.findMany({
      where: {
        tenantId,
        instanceName: { not: { startsWith: 'DELETED_' } },
      },
      select: { id: true, instanceName: true, phone: true, status: true },
      orderBy: { instanceName: 'asc' },
    });
    res.json(instances);
  } catch (err) {
    console.error('[leads] Erro ao listar instancias:', err.message);
    res.status(500).json({ error: 'Erro ao listar instancias' });
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

// POST /api/leads/manual - Adicionar leads manualmente
async function createManualLeads(req, res) {
  try {
    const tenantId = req.user.tenantId;
    const { leads = [] } = req.body;

    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ error: 'Informe pelo menos um contato manual' });
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const savedLeads = [];

    for (const item of leads.slice(0, 500)) {
      const phone = normalizeLeadPhone(item.phone);
      const name = String(item.name || item.phone || '').trim();
      if (!phone || phone.length < 10 || !name) {
        skipped++;
        continue;
      }

      const existing = await prisma.lead.findFirst({ where: { tenantId, phone } });
      if (existing) {
        const lead = await prisma.lead.update({
          where: { id: existing.id },
          data: {
            name: name || existing.name,
            category: item.category || existing.category,
            query: existing.query || 'manual',
          },
        });
        savedLeads.push(lead);
        updated++;
      } else {
        const lead = await prisma.lead.create({
          data: {
            tenantId,
            placeId: `manual_${phone}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name,
            phone,
            category: item.category || 'Manual',
            query: 'manual',
          },
        });
        savedLeads.push(lead);
        created++;
      }
    }

    res.json({
      message: `${created} contatos adicionados, ${updated} atualizados, ${skipped} ignorados.`,
      created,
      updated,
      skipped,
      leads: savedLeads,
    });
  } catch (err) {
    console.error('[leads] Erro ao adicionar manualmente:', err.message);
    res.status(500).json({ error: 'Erro ao adicionar contatos: ' + err.message });
  }
}

// POST /api/leads/send — Enviar WhatsApp em massa para leads selecionados
async function sendToLeads(req, res) {
  try {
    const tenantId = req.user.tenantId;
    const { leadIds, message, mediaUrl, mediaType, instanceId, delayMinSeconds = 2, delayMaxSeconds = 5 } = req.body;
    const hasText = Boolean(String(message || '').trim());
    const hasMedia = Boolean(mediaUrl && mediaType);

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'Selecione pelo menos um lead' });
    }
    if (!hasText && !hasMedia) {
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

    const connectedInstances = tenant.instances.filter(i => i.status === 'connected');
    const instance = instanceId
      ? connectedInstances.find(i => i.id === instanceId)
      : connectedInstances[0];
    if (!instance) {
      return res.status(400).json({ error: instanceId ? 'A instância escolhida não está conectada' : 'Nenhuma instância WhatsApp conectada' });
    }

    const minDelay = Math.max(0, Math.min(300, Number(delayMinSeconds) || 0));
    const maxDelay = Math.max(minDelay, Math.min(300, Number(delayMaxSeconds) || minDelay));

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
        const phone = normalizeLeadPhone(lead.phone);
        if (phone.length < 10) {
          failed++;
          continue;
        }

        const path = require('path');
        const stepErrors = [];
        let delivered = false;

        if (hasText && !hasMedia) {
          try {
            await evolutionService.sendText(
              tenant.settings.evolutionUrl,
              tenant.settings.evolutionKey,
              instance.instanceName,
              phone,
              message
            );
            delivered = true;
          } catch (textErr) {
            stepErrors.push(`texto: ${textErr.message}`);
          }
        }

        if (hasMedia) {
          try {
            const fullPath = path.resolve(__dirname, '../../', String(mediaUrl).replace(/^\/+/, ''));
            const fs = require('fs');
            if (!fs.existsSync(fullPath)) {
              throw new Error(`arquivo de mídia não encontrado em ${fullPath}`);
            }
            await evolutionService.sendMedia(
              tenant.settings.evolutionUrl,
              tenant.settings.evolutionKey,
              instance.instanceName,
              phone,
              {
                mediatype: mediaType === 'image' ? 'image' : 'document',
                mimetype: mediaType === 'image' ? 'image/jpeg' : 'application/octet-stream',
                caption: hasText ? message : '',
                filePath: fullPath,
                filename: path.basename(mediaUrl),
              }
            );
            delivered = true;
          } catch (mediaErr) {
            stepErrors.push(`mídia: ${mediaErr.message}`);
          }
        }

        if (!delivered) {
          failed++;
          errors.push(`${lead.name}: ${stepErrors.join(' | ') || 'falha ao enviar'}`);
          continue;
        }

        if (stepErrors.length > 0) {
          errors.push(`${lead.name}: ${stepErrors.join(' | ')}`);
        }

        sent++;

        // Marca o lead como enviado
        await prisma.lead.update({
          where: { id: lead.id },
          data: { sentAt: new Date(), sentCount: { increment: 1 } }
        });

        // Delay aleatorio entre envios para reduzir risco de bloqueio.
        if (sent + failed < leadsWithPhone.length) {
          await sleep(randomDelayMs(minDelay, maxDelay));
        }
      } catch (err) {
        failed++;
        errors.push(`${lead.name}: ${err.message}`);
        console.warn(`[leads] Falha ao enviar para ${lead.name}:`, err.message);
      }
    }

    console.log(`[leads] Envio finalizado: ${sent} enviados, ${failed} falhas`);
    res.json({
      message: `${sent} mensagens enviadas com sucesso. ${failed} falharam.${errors.length ? ' Alguns envios tiveram falhas parciais.' : ''}`,
      sent,
      failed,
      instance: instance.instanceName,
      delay: { minSeconds: minDelay, maxSeconds: maxDelay },
      errors: errors.slice(0, 5), // Limita erros retornados
    });
  } catch (err) {
    console.error('[leads] Erro no envio em massa:', err.message);
    res.status(500).json({ error: 'Erro ao enviar mensagens: ' + err.message });
  }
}

module.exports = { searchLeads, getLeads, getLeadInstances, createManualLeads, deleteLead, deleteAllLeads, sendToLeads };
