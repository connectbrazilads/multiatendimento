const axios = require('axios');

function buildAuthHeaders(settings) {
  const apiKey = settings?.firebirdApiKey;
  const authMode = (settings?.firebirdAuthMode || 'bearer').toLowerCase();

  if (!apiKey || authMode === 'none') return {};
  if (authMode === 'x-api-key') return { 'x-api-key': apiKey };

  return { Authorization: `Bearer ${apiKey}` };
}

function createCompanyApiClient(settings) {
  const baseURL = (settings?.firebirdApiUrl || '').trim().replace(/\/+$/, '');

  if (!baseURL) {
    throw new Error('URL da API da empresa nao configurada.');
  }

  return axios.create({
    baseURL,
    timeout: 20000,
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(settings),
    },
  });
}

function normalizeRemoteContact(remote) {
  if (!remote || typeof remote !== 'object') return null;

  const pick = (...values) => values.find((value) => value !== undefined && value !== null && String(value).trim() !== '');

  const equipment = pick(
    remote.equipment,
    remote.equipments?.[0],
    remote.device,
    remote.devices?.[0]
  );

  return {
    externalId: pick(remote.id, remote.externalId, remote.codigo, remote.code, remote.customerId),
    name: pick(remote.name, remote.nome, remote.razaoSocial, remote.customerName, remote.cliente, remote.customer),
    fantasyName: pick(remote.fantasyName, remote.nomeFantasia, remote.fantasia),
    phone: pick(remote.phone, remote.telefone, remote.celular, remote.whatsapp, remote.mobile),
    email: pick(remote.email, remote.mail),
    cpfCnpj: pick(remote.cpfCnpj, remote.cnpj, remote.cpf, remote.document),
    address: pick(remote.address, remote.endereco, remote.logradouro),
    city: pick(remote.city, remote.cidade),
    state: pick(remote.state, remote.uf),
    zipCode: pick(remote.zipCode, remote.cep),
    equipment: equipment && typeof equipment === 'object'
      ? {
          manufacturer: pick(equipment.manufacturer, equipment.fabricante, equipment.brand),
          model: pick(equipment.model, equipment.modelo),
          serialNumber: pick(equipment.serialNumber, equipment.serie, equipment.serial, equipment.sn),
          type: pick(equipment.type, equipment.tipo),
          sector: pick(equipment.sector, equipment.setor, equipment.department),
          address: pick(equipment.address, equipment.endereco),
        }
      : null,
  };
}

async function pingCompanyApi(settings) {
  const client = createCompanyApiClient(settings);
  const healthPath = (settings?.firebirdHealthPath || '/health').trim() || '/health';
  const response = await client.get(healthPath);
  return response.data;
}

async function fetchCompanyContacts(settings, options = {}) {
  const client = createCompanyApiClient(settings);
  const contactsPath = (settings?.firebirdContactsPath || '/contacts').trim() || '/contacts';
  const params = {};

  if (options.updatedSince) {
    const since = options.updatedSince instanceof Date
      ? options.updatedSince.toISOString()
      : options.updatedSince;
    params.updatedSince = since;
  }

  if (options.limit) {
    params.limit = options.limit;
  }

  const response = await client.get(contactsPath, { params });
  const data = response.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;

  return [];
}

module.exports = {
  createCompanyApiClient,
  fetchCompanyContacts,
  normalizeRemoteContact,
  pingCompanyApi,
};
