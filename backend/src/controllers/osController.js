const prisma = require('../lib/prisma');
const pdfmake = require('pdfmake');
const path = require('path');
const fs = require('fs');
const { draftServiceOrder } = require('../services/geminiService');

async function getEquipments(req, res) {
  const { contactId } = req.params;
  const { tenantId } = req.user;

  try {
    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact) return res.json([]);

    // Filtros dinâmicos para evitar erro de 'null' em campos obrigatórios do Prisma
    const orFilters = [{ contactId }];
    
    if (contact.phone) {
      orFilters.push({ contact: { whatsapp: contact.phone } });
    }
    
    if (contact.whatsapp) {
      orFilters.push({ contact: { phone: contact.whatsapp } });
    }

    const equipments = await prisma.equipment.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: orFilters
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(equipments);
  } catch (err) {
    console.error('[getEquipments] erro crítico:', err);
    res.status(500).json({ error: 'Erro ao buscar equipamentos' });
  }
}

async function addEquipment(req, res) {
  const { contactId } = req.params;
  const { manufacturer, model, serialNumber, sector, address } = req.body;
  const equipment = await prisma.equipment.create({
    data: {
      tenantId: req.user.tenantId,
      contactId,
      manufacturer,
      model,
      serialNumber,
      sector,
      address
    }
  });
  res.json(equipment);
}

async function updateEquipment(req, res) {
  const { id } = req.params;
  const { manufacturer, model, serialNumber, sector, address, isActive } = req.body;
  const equipment = await prisma.equipment.update({
    where: { id, tenantId: req.user.tenantId },
    data: { manufacturer, model, serialNumber, sector, address, isActive }
  });
  res.json(equipment);
}

async function deleteEquipment(req, res) {
  const { id } = req.params;
  const { tenantId } = req.user;
  try {
    await prisma.equipment.delete({ where: { id, tenantId } });
    res.json({ message: 'Equipamento excluído com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir equipamento' });
  }
}

async function getOSList(req, res) {
  const { startDate, endDate, search, status } = req.query;
  const { tenantId } = req.user;

  const where = { tenantId };

  if (status) {
    where.status = status;
  }

  if (startDate && startDate.length > 0) {
    if (!where.createdAt) where.createdAt = {};
    where.createdAt.gte = new Date(startDate);
  }
  if (endDate && endDate.length > 0) {
    if (!where.createdAt) where.createdAt = {};
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    where.createdAt.lte = end;
  }

  if (search) {
    where.OR = [
      { id: { contains: search, mode: 'insensitive' } },
      { contact: { name: { contains: search, mode: 'insensitive' } } },
      { contact: { fantasyName: { contains: search, mode: 'insensitive' } } },
      { equipment: { model: { contains: search, mode: 'insensitive' } } },
      { equipment: { serialNumber: { contains: search, mode: 'insensitive' } } },
      { equipment: { contact: { name: { contains: search, mode: 'insensitive' } } } },
      { equipment: { contact: { fantasyName: { contains: search, mode: 'insensitive' } } } }
    ];
  }

  const orders = await prisma.serviceOrder.findMany({
    where,
    include: {
      contact: true,
      equipment: {
        include: {
          contact: true
        }
      },
      user: { select: { name: true } },
      closedBy: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  res.json(orders);
}

async function createOS(req, res) {
  const { contactId, equipmentId, ticketId, defect, status } = req.body;
  const os = await prisma.serviceOrder.create({
    data: {
      tenantId: req.user.tenantId,
      userId: req.user.id,
      contactId,
      equipmentId,
      ticketId,
      defect,
      status: status || 'PENDENTE'
    },
    include: { contact: true, equipment: true }
  });
  res.json(os);
}

async function updateOS(req, res) {
  const { id } = req.params;
  const { status, technicalNotes, meters } = req.body;
  const { tenantId, id: userId } = req.user;

  // Trava de segurança: Exigir relatório para finalizar ou arquivar
  if ((status === 'FINALIZADA' || status === 'ARQUIVADA') && (!technicalNotes || technicalNotes.trim().length < 5)) {
    return res.status(400).json({ error: 'Relatório Técnico é obrigatório para finalizar ou arquivar a O.S.' });
  }

  const data = {
    status,
    technicalNotes,
    meters: meters ? JSON.stringify(meters) : undefined
  };

  if (status === 'FINALIZADA' || status === 'ARQUIVADA') {
    data.closedAt = new Date();
    data.closedById = userId;
  }

  const os = await prisma.serviceOrder.update({
    where: { id, tenantId },
    data,
    include: { contact: true, equipment: true }
  });
  res.json(os);
}

async function generatePdf(req, res) {
  const { id } = req.params;
  const os = await prisma.serviceOrder.findFirst({
    where: { id, tenantId: req.user.tenantId },
    include: { 
      contact: true, 
      equipment: true, 
      tenant: { include: { settings: true } },
      user: true 
    }
  });

  if (!os) return res.status(404).json({ error: 'O.S. não encontrada' });

  // Busca o cliente real (empresa vinculada)
  let clientData = os.contact;
  let solicitante = os.contact.name;
  
  try {
    const filters = [];
    if (os.contact.phone) {
      filters.push({ whatsapp: os.contact.phone });
      filters.push({ phone: os.contact.phone });
    }
    if (os.contact.whatsapp) {
      filters.push({ phone: os.contact.whatsapp });
      filters.push({ whatsapp: os.contact.whatsapp });
    }

    if (filters.length > 0) {
      const linked = await prisma.contact.findFirst({
        where: {
          tenantId: req.user.tenantId,
          id: { not: os.contactId },
          AND: [
            { OR: filters },
            {
              OR: [
                { fantasyName: { not: '' } },
                { cpfCnpj: { not: '' } },
                { name: { contains: 'AFABAN' } }
              ]
            }
          ]
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (linked) {
        clientData = linked;
      }
    }
  } catch (err) {
    console.error('[generatePdf] erro ao buscar empresa vinculada:', err);
  }

  try {
    const fontsPath = path.join(__dirname, '..', '..', 'node_modules', 'pdfmake', 'fonts', 'Roboto');
    console.log('[generatePdf] Carregando fontes de:', fontsPath);

    const fonts = {
      Roboto: {
        normal: path.join(fontsPath, 'Roboto-Regular.ttf'),
        bold: path.join(fontsPath, 'Roboto-Medium.ttf'),
        italics: path.join(fontsPath, 'Roboto-Italic.ttf'),
        bolditalics: path.join(fontsPath, 'Roboto-MediumItalic.ttf')
      }
    };

    pdfmake.setFonts(fonts);
    
    const dataOS = os.createdAt.toLocaleDateString('pt-BR');
    const horaOS = os.createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    let meters = {};
    if (os.meters && os.meters.trim()) {
      try {
        meters = JSON.parse(os.meters);
      } catch (e) {
        console.error('[generatePdf] Erro ao parsear medidores:', os.meters);
      }
    }

    const settings = os.tenant.settings;
    const attendantName = os.user ? os.user.name : 'N/A';

    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [30, 30, 30, 30],
      content: [
        {
          table: {
            widths: [110, '*', 160],
            body: [
              [
                {
                  stack: (() => {
                    try {
                      if (os.tenant.logoUrl) {
                        const logoFilename = os.tenant.logoUrl.split('/').pop();
                        const logoPath = path.resolve(__dirname, '..', '..', 'uploads', logoFilename);
                        console.log('[generatePdf] Tentando carregar logo de:', logoPath);
                        if (fs.existsSync(logoPath)) {
                          return [{ image: logoPath, width: 100, alignment: 'center' }];
                        } else {
                          console.warn('[generatePdf] Arquivo da logo não existe no caminho:', logoPath);
                        }
                      }
                    } catch (err) {
                      console.error('[generatePdf] Erro ao carregar logo:', err.message);
                    }
                    return [
                      { text: 'LOGO', style: 'logoPlaceholder' },
                      { text: settings?.companyName || os.tenant.name, fontSize: 7, alignment: 'center', margin: [0, 5, 0, 0] }
                    ];
                  })(),
                  alignment: 'center',
                  margin: [0, 5, 0, 5]
                },
                {
                  stack: [
                    { text: settings?.companyName || os.tenant.name, bold: true, fontSize: 10, margin: [0, 5, 0, 2] },
                    { text: `CNPJ: ${settings?.companyCnpj || 'N/A'}   |   I.E.: ${settings?.companyIE || 'N/A'}`, fontSize: 8, margin: [0, 0, 0, 2] },
                    { text: `Endereço: ${settings?.companyAddress || 'N/A'} - Bairro: ${settings?.companyBairro || 'N/A'}`, fontSize: 8, margin: [0, 0, 0, 2] },
                    { text: `Cidade: PORTO ALEGRE (RS)   |   CEP: ${settings?.companyCep || 'N/A'}`, fontSize: 8, margin: [0, 0, 0, 2] },
                    { text: `Fone: ${settings?.companyPhone || 'N/A'}`, fontSize: 8 }
                  ],
                  alignment: 'center'
                },
                {
                  stack: [
                    { text: 'ORDEM DE SERVIÇO', bold: true, fontSize: 14, alignment: 'center', margin: [0, 2, 0, 5] },
                    { 
                      table: {
                        widths: ['*', '*'],
                        body: [
                          [{ text: 'Número: ' + os.id.substring(os.id.length - 6).toUpperCase(), fontSize: 8 }, { text: 'Data: ' + dataOS, fontSize: 8 }],
                          [{ text: 'Hora: ' + horaOS, fontSize: 8 }, { text: 'Atendente: ' + attendantName, fontSize: 8 }]
                        ]
                      },
                      layout: 'noBorders'
                    }
                  ],
                  fillColor: '#F5F5F5'
                }
              ]
            ]
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#CCC',
            vLineColor: () => '#CCC'
          }
        },
        
        { text: 'DADOS DO CLIENTE', style: 'sectionHeader', margin: [0, 15, 0, 5] },
        {
          table: {
            widths: ['*', '*'],
            body: [
              [
                { text: [{ text: 'CLIENTE / RAZÃO SOCIAL: \n', style: 'label' }, { text: clientData.name || 'N/A', style: 'value' }], colSpan: 2 },
                {}
              ],
              [
                { text: [{ text: 'NOME FANTASIA: \n', style: 'label' }, { text: clientData.fantasyName || 'N/A', style: 'value' }] },
                { text: [{ text: 'CNPJ / CPF: \n', style: 'label' }, { text: clientData.cpfCnpj || 'N/A', style: 'value' }] }
              ],
              [
                { text: [{ text: 'ENDEREÇO: \n', style: 'label' }, { text: clientData.address || 'N/A', style: 'value' }], colSpan: 2 },
                {}
              ],
              [
                { text: [{ text: 'SOLICITANTE: \n', style: 'label' }, { text: solicitante, style: 'value' }] },
                { text: [{ text: 'TELEFONE: \n', style: 'label' }, { text: os.contact.phone || 'N/A', style: 'value' }] }
              ]
            ]
          },
          layout: {
            hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 0 : 0.5,
            vLineWidth: () => 0,
            hLineColor: () => '#DDD',
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 4,
            paddingBottom: () => 4
          }
        },

        { text: 'DADOS DO EQUIPAMENTO', style: 'sectionHeader', margin: [0, 15, 0, 5] },
        {
          table: {
            widths: ['*', '*', '*'],
            body: [
              [
                { text: [{ text: 'EQUIPAMENTO / MODELO: \n', style: 'label' }, { text: os.equipment.model, style: 'value' }] },
                { text: [{ text: 'Nº SÉRIE: \n', style: 'label' }, { text: os.equipment.serialNumber || 'N/A', style: 'value' }] },
                { text: [{ text: 'SETOR: \n', style: 'label' }, { text: os.equipment.sector || 'N/A', style: 'value' }] }
              ],
              [
                { text: [{ text: 'LOCALIZAÇÃO / ENDEREÇO TÉCNICO: \n', style: 'label' }, { text: os.equipment.address || 'Mesmo do cliente', style: 'value' }], colSpan: 3 },
                {}, {}
              ]
            ]
          },
          layout: {
            hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 0 : 0.5,
            vLineWidth: () => 0,
            hLineColor: () => '#DDD',
            paddingTop: () => 4,
            paddingBottom: () => 4
          }
        },

        { text: 'DESCRIÇÃO DO DEFEITO / SOLICITAÇÃO', style: 'sectionHeader', margin: [0, 15, 0, 5] },
        { 
          text: os.defect || 'Nenhum defeito reportado', 
          style: 'boxContent' 
        },

        { text: 'INTERVENÇÃO TÉCNICA E LEITURA DE CONTADORES', style: 'sectionHeader', margin: [0, 15, 0, 5] },
        {
          table: {
            widths: ['*', '*', '*'],
            body: [
              [
                { text: [{ text: 'CONTADOR PB: \n', style: 'label' }, { text: meters.mono || '_________', style: 'value' }] },
                { text: [{ text: 'CONTADOR COR: \n', style: 'label' }, { text: meters.color || '_________', style: 'value' }] },
                { text: [{ text: 'CONTADOR SCAN: \n', style: 'label' }, { text: meters.scan || '_________', style: 'value' }] }
              ]
            ]
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#DDD',
            vLineColor: () => '#DDD',
            paddingTop: () => 6,
            paddingBottom: () => 6
          }
        },

        { text: 'RELATÓRIO TÉCNICO / PEÇAS SUBSTITUÍDAS', style: 'sectionHeader', margin: [0, 15, 0, 5] },
        { 
          text: os.technicalNotes || '\n\n\n\n\n', 
          style: 'boxContent',
          minHeight: 100
        },

        {
          margin: [0, 40, 0, 0],
          columns: [
            {
              stack: [
                { text: '_______________________________________', margin: [0, 0, 0, 5] },
                { text: 'ASSINATURA E CARIMBO DO CLIENTE', style: 'signatureLabel' }
              ],
              alignment: 'center'
            },
            {
              stack: [
                { text: '_______________________________________', margin: [0, 0, 0, 5] },
                { text: 'ASSINATURA DO TÉCNICO', style: 'signatureLabel' }
              ],
              alignment: 'center'
            }
          ]
        },
        {
          text: 'Declaro que os serviços acima foram executados a contento e os materiais/peças foram fornecidos conforme descrito.',
          style: 'footerNote',
          margin: [0, 20, 0, 0],
          alignment: 'center'
        }
      ],
      styles: {
        header: { fontSize: 24, bold: true, color: '#333' },
        osNumber: { fontSize: 11, color: '#333', bold: true },
        sectionHeader: { fontSize: 10, bold: true, color: '#000', background: '#EEE', padding: [5, 3] },
        label: { fontSize: 8, color: '#555', bold: true },
        value: { fontSize: 11, color: '#000', bold: true },
        boxContent: { fontSize: 11, margin: [0, 5, 0, 10], color: '#333', border: [true, true, true, true] },
        signatureLabel: { fontSize: 8, color: '#333', bold: true },
        footerNote: { fontSize: 7, italic: true, color: '#666' },
        logoPlaceholder: { fontSize: 12, bold: true, color: '#CCC', background: '#F0F0F0', margin: [0, 10] }
      },
      defaultStyle: {
        font: 'Roboto'
      }
    };

    const doc = pdfmake.createPdf(docDefinition);
    const stream = await doc.getStream();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="OS_${os.id.substring(os.id.length - 6)}.pdf"`);
    
    stream.pipe(res);
    stream.end();
  } catch (err) {
    console.error('[generatePdf] erro fatal na geração do PDF:', err);
    if (!res.headersSent) {
      res.status(500).send('Erro ao gerar PDF: ' + err.message);
    }
  }
}

async function draftOS(req, res) {
  const { contactId, ticketId } = req.body;
  const { tenantId } = req.user;

  try {
    const settings = await prisma.tenantSettings.findUnique({ where: { tenantId } });
    if (!settings || !settings.geminiKey) return res.status(400).json({ error: 'Chave do Gemini não configurada' });

    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact) return res.status(404).json({ error: 'Contato não encontrado' });

    // Busca equipamentos vinculados diretamente ou por telefone (CRM link)
    const orFilters = [{ contactId }];
    if (contact.phone) orFilters.push({ contact: { whatsapp: contact.phone } });
    if (contact.whatsapp) orFilters.push({ contact: { phone: contact.whatsapp } });

    const equipments = await prisma.equipment.findMany({ 
      where: { 
        tenantId, 
        isActive: true,
        OR: orFilters
      } 
    });

    const messages = await prisma.message.findMany({
      where: { 
        ticketId,
        ticket: { tenantId }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    
    // As mensagens vêm desc, o history espera asc (antigas primeiro)
    const history = messages.reverse();

    const draft = await draftServiceOrder(settings.geminiKey, history, equipments);
    res.json(draft);
  } catch (err) {
    console.error('[draftOS]', err);
    res.status(500).json({ error: 'Erro ao gerar rascunho de O.S.' });
  }
}

module.exports = { getEquipments, addEquipment, updateEquipment, deleteEquipment, getOSList, createOS, updateOS, generatePdf, draftOS };
