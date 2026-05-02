const prisma = require('../lib/prisma');
const evolution = require('../services/evolutionService');

async function getSettings(tenantId) {
  const s = await prisma.tenantSettings.findUnique({ where: { tenantId } });
  if (!s?.evolutionUrl || !s?.evolutionKey) throw new Error('Evolution API não configurada');
  return s;
}

async function list(req, res) {
  try {
    const instances = await prisma.waInstance.findMany({ where: { tenantId: req.user.tenantId } });
    
    let settings;
    try {
      settings = await getSettings(req.user.tenantId);
    } catch {
      // Se não estiver configurado, retorna a lista do banco mas sem o status real
      return res.json(instances.map(i => ({ ...i, state: 'close' })));
    }

    const { evolutionUrl, evolutionKey } = settings;

    const result = await Promise.all(instances.map(async (inst) => {
      try {
        const data = await evolution.getConnectionState(evolutionUrl, evolutionKey, inst.instanceName);
        const state = data?.instance?.state || data?.state || 'close';
        
        const updated = await prisma.waInstance.update({
          where: { id: inst.id },
          data: { status: state === 'open' ? 'connected' : 'disconnected' }
        });
        return { ...updated, state };
      } catch {
        return { ...inst, state: 'close' };
      }
    }));

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function create(req, res) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

    // Verifica limite do plano
    const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenantId } });
    const count = await prisma.waInstance.count({ where: { tenantId: req.user.tenantId } });
    
    if (count >= tenant.maxConnections) {
      return res.status(403).json({ 
        error: `Limite de conexões atingido (${tenant.maxConnections}). Faça um upgrade para adicionar mais números.` 
      });
    }

    const { evolutionUrl, evolutionKey } = await getSettings(req.user.tenantId);
    
    const instanceName = `${req.user.tenantId}_${name.toLowerCase().replace(/\s+/g, '_')}`;

    // Cria na Evolution
    await evolution.createInstance(evolutionUrl, evolutionKey, instanceName);

    // Salva no banco
    const inst = await prisma.waInstance.create({
      data: {
        tenantId: req.user.tenantId,
        instanceName,
        status: 'disconnected'
      }
    });

    // Setup Webhook automático
    const backendUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3002}`;
    const webhookUrl = `${backendUrl}/api/webhook`;
    await evolution.setWebhook(evolutionUrl, evolutionKey, instanceName, webhookUrl);

    res.json(inst);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function getQrCode(req, res) {
  try {
    const { id } = req.params;
    const inst = await prisma.waInstance.findFirst({ where: { id, tenantId: req.user.tenantId } });
    if (!inst) return res.status(404).json({ error: 'Instância não encontrada' });

    const { evolutionUrl, evolutionKey } = await getSettings(req.user.tenantId);
    const data = await evolution.getQrCode(evolutionUrl, evolutionKey, inst.instanceName);
    
    res.json({ 
      qrcode: data?.base64 || data?.qrcode?.base64 || null, 
      pairingCode: data?.pairingCode || null 
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    const inst = await prisma.waInstance.findFirst({ where: { id, tenantId: req.user.tenantId } });
    if (!inst) return res.status(404).json({ error: 'Instância não encontrada' });

    const { evolutionUrl, evolutionKey } = await getSettings(req.user.tenantId);
    
    // Tenta deletar na Evolution (ignora erro se já não existir lá)
    try { await evolution.deleteInstance(evolutionUrl, evolutionKey, inst.instanceName); } catch {}

    // Deleta no banco
    await prisma.waInstance.delete({ where: { id } });

    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = { list, create, getQrCode, remove };
