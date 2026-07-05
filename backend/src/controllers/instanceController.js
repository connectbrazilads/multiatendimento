const prisma = require('../lib/prisma');
const evolution = require('../services/evolutionService');

async function getSettings(tenantId) {
  const s = await prisma.tenantSettings.findUnique({ where: { tenantId } });
  const evolutionUrl = s?.evolutionUrl || process.env.DEFAULT_EVOLUTION_URL;
  const evolutionKey = s?.evolutionKey || process.env.DEFAULT_EVOLUTION_KEY;
  if (!evolutionUrl || !evolutionKey) throw new Error('Evolution API não configurada. Contate o administrador.');
  return { ...s, evolutionUrl, evolutionKey };
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
        
        let phoneStr = inst.phone;
        if (state === 'open' && !phoneStr) {
          try {
            const info = await evolution.fetchInstanceInfo(evolutionUrl, evolutionKey, inst.instanceName);
            const owner = info?.ownerJid || info?.owner || info?.instance?.owner || info?.number;
            if (owner && typeof owner === 'string') {
              phoneStr = owner.split('@')[0];
            }
          } catch (e) {
            console.error('[instanceController] Erro ao buscar info da instancia:', e.message);
          }
        }
        
        const updated = await prisma.waInstance.update({
          where: { id: inst.id },
          data: { 
            status: state === 'open' ? 'connected' : 'disconnected',
            phone: phoneStr
          }
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
    console.log(`[instanceController] Criando instância "${instanceName}" na Evolution...`);
    try {
      await evolution.createInstance(evolutionUrl, evolutionKey, instanceName);
    } catch (err) {
      const responseData = err.response?.data;
      const responseMsg = responseData?.response?.message;
      const isAlreadyInUse = Array.isArray(responseMsg)
        ? responseMsg.some(msg => String(msg).includes('already in use'))
        : String(responseMsg || '').includes('already in use');

      if (isAlreadyInUse) {
        console.log(`[instanceController] Instância "${instanceName}" já existe na Evolution. Prosseguindo com o vínculo no banco de dados.`);
      } else {
        console.error(`[instanceController] Erro ao criar na Evolution:`, responseData || err.message);
        const errorMsg = responseData?.message || err.message;
        return res.status(400).json({ error: `Erro na Evolution API: ${errorMsg}` });
      }
    }

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
    console.error(`[instanceController] Erro geral ao criar instância:`, err);
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
