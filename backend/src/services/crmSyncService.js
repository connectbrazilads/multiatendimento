const prisma = require('../lib/prisma');

async function syncCrmEquipmentsToEquipment(tenantId, contactId) {
  try {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId }
    });
    
    if (!contact || !contact.crmCustomerId) {
      console.log(`[crmSyncService] Contato ${contactId} não está vinculado a um cliente CRM ou não existe.`);
      return;
    }

    console.log(`[crmSyncService] Iniciando sincronização de equipamentos do CRM Customer ${contact.crmCustomerId} para Contact ${contactId}`);

    // Busca equipamentos CRM ativos
    const crmEquipments = await prisma.crmEquipment.findMany({
      where: {
        tenantId,
        customerId: contact.crmCustomerId,
        isActive: true
      }
    });

    console.log(`[crmSyncService] Encontrados ${crmEquipments.length} equipamentos no CRM.`);

    for (const crmEquip of crmEquipments) {
      const externalSource = crmEquip.externalSource || 'firebird';
      const externalId = crmEquip.externalId;

      await prisma.equipment.upsert({
        where: {
          tenantId_externalSource_externalId: {
            tenantId,
            externalSource,
            externalId
          }
        },
        update: {
          contactId: contact.id,
          model: crmEquip.model,
          manufacturer: crmEquip.manufacturer,
          type: crmEquip.type,
          serialNumber: crmEquip.serialNumber,
          sector: crmEquip.sector || crmEquip.installLocation || 'Geral',
          address: crmEquip.address,
          isActive: crmEquip.isActive
        },
        create: {
          tenantId,
          contactId: contact.id,
          externalSource,
          externalId,
          model: crmEquip.model,
          manufacturer: crmEquip.manufacturer,
          type: crmEquip.type,
          serialNumber: crmEquip.serialNumber,
          sector: crmEquip.sector || crmEquip.installLocation || 'Geral',
          address: crmEquip.address,
          isActive: crmEquip.isActive
        }
      });
    }
    console.log(`[crmSyncService] Sincronização concluída com sucesso para Contact ${contactId}`);
  } catch (err) {
    console.error(`[crmSyncService] Erro ao sincronizar para contato ${contactId}:`, err);
  }
}

module.exports = {
  syncCrmEquipmentsToEquipment
};
