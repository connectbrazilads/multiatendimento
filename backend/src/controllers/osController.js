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

    // Sincroniza os equipamentos do CRM para o contato
    const { syncCrmEquipmentsToEquipment } = require('../services/crmSyncService');
    await syncCrmEquipmentsToEquipment(tenantId, contactId);

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
  const { manufacturer, model, serialNumber, sector, address, type } = req.body;
  const equipment = await prisma.equipment.create({
    data: {
      tenantId: req.user.tenantId,
      contactId,
      manufacturer,
      model,
      serialNumber,
      sector,
      address,
      type
    }
  });
  res.json(equipment);
}

async function updateEquipment(req, res) {
  const { id } = req.params;
  const { manufacturer, model, serialNumber, sector, address, type, isActive } = req.body;
  const equipment = await prisma.equipment.update({
    where: { id, tenantId: req.user.tenantId },
    data: { manufacturer, model, serialNumber, sector, address, type, isActive }
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
    const emissionDate = new Date().toLocaleString('pt-BR');
    
    let meters = {};
    if (os.meters && os.meters.trim()) {
      try {
        meters = JSON.parse(os.meters);
      } catch (e) {
        console.error('[generatePdf] Erro ao parsear medidores:', os.meters);
      }
    }

    const settings = os.tenant.settings;
    const primaryColor = '#000000'; // Alterado de dourado para preto conforme solicitado
    const attendantName = os.user ? os.user.name : 'N/A';

    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 60],
      footer: (currentPage, pageCount) => {
        return {
          stack: [
            { canvas: [{ type: 'line', x1: 40, y1: 0, x2: 555, y2: 0, lineWidth: 0.5, lineColor: '#EEEEEE' }] },
            {
              columns: [
                { text: `Documento gerado em ${emissionDate}`, fontSize: 7, color: '#999', margin: [40, 10, 0, 0] },
                { text: `Página ${currentPage} de ${pageCount}`, fontSize: 7, color: '#999', alignment: 'right', margin: [0, 10, 40, 0] }
              ]
            }
          ]
        };
      },
      content: [
        // Top Banner / Header
        {
          table: {
            widths: [120, '*', 150],
            body: [
              [
                {
                  stack: (() => {
                    try {
                      if (os.tenant.logoUrl) {
                        const logoFilename = os.tenant.logoUrl.split('/').pop();
                        const logoPath = path.resolve(__dirname, '..', '..', 'uploads', logoFilename);
                        if (fs.existsSync(logoPath)) {
                          return [{ image: logoPath, width: 100, alignment: 'center', margin: [0, 5, 0, 5] }];
                        }
                      }
                    } catch (err) {}
                    return [{ text: 'LOGO', style: 'logoPlaceholder' }];
                  })(),
                  border: [false, false, false, true],
                  borderColor: [null, null, null, primaryColor]
                },
                {
                  stack: [
                    { text: settings?.companyName || os.tenant.name, bold: true, fontSize: 11, margin: [0, 5, 0, 2], color: primaryColor },
                    { text: `CNPJ: ${settings?.companyCnpj || 'N/A'}  |  I.E.: ${settings?.companyIE || 'N/A'}`, fontSize: 8, margin: [0, 0, 0, 2], color: '#666' },
                    { text: `${settings?.companyAddress || 'N/A'}, ${settings?.companyBairro || 'N/A'}`, fontSize: 8, margin: [0, 0, 0, 2], color: '#666' },
                    { text: `CEP: ${settings?.companyCep || 'N/A'}  |  ${settings?.companyCity || 'N/A'} (${settings?.companyState || 'N/A'})`, fontSize: 8, margin: [0, 0, 0, 2], color: '#666' },
                    { text: `Fone: ${settings?.companyPhone || 'N/A'}`, fontSize: 8, color: '#666' }
                  ],
                  alignment: 'center',
                  border: [false, false, false, true],
                  borderColor: [null, null, null, primaryColor]
                },
                {
                  stack: [
                    { text: 'ORDEM DE SERVIÇO', bold: true, fontSize: 13, alignment: 'center', color: '#FFFFFF', margin: [0, 8, 0, 8] },
                    {
                      table: {
                        widths: ['*', '*'],
                        body: [
                          [{ text: 'Número', style: 'miniLabel' }, { text: 'Data', style: 'miniLabel' }],
                          [{ text: os.id.substring(os.id.length - 6).toUpperCase(), style: 'miniValue' }, { text: dataOS, style: 'miniValue' }],
                          [{ text: 'Atendente', style: 'miniLabel' }, { text: 'Hora', style: 'miniLabel' }],
                          [{ text: attendantName, style: 'miniValue' }, { text: horaOS, style: 'miniValue' }]
                        ]
                      },
                      layout: 'noBorders',
                      margin: [5, 0, 5, 5]
                    }
                  ],
                  fillColor: primaryColor,
                  border: [false, false, false, false]
                }
              ]
            ]
          },
          layout: {
            hLineWidth: (i, node) => (i === 1) ? 2 : 0,
            vLineWidth: () => 0
          }
        },

        // Client Data Section
        { 
          table: {
            widths: ['*'],
            body: [[{ text: 'DADOS DO CLIENTE', style: 'sectionTitle', fillColor: primaryColor }]]
          },
          margin: [0, 20, 0, 0],
          layout: 'noBorders'
        },
        {
          table: {
            widths: ['*', '*'],
            body: [
              [
                { text: [{ text: 'RAZÃO SOCIAL:\n', style: 'label' }, { text: clientData.name || 'N/A', style: 'value' }], colSpan: 2, border: [false, false, false, true] },
                {}
              ],
              [
                { text: [{ text: 'NOME FANTASIA:\n', style: 'label' }, { text: clientData.fantasyName || 'N/A', style: 'value' }], border: [false, false, false, true] },
                { text: [{ text: 'CNPJ / CPF:\n', style: 'label' }, { text: clientData.cpfCnpj || 'N/A', style: 'value' }], border: [false, false, false, true] }
              ],
              [
                { text: [{ text: 'ENDEREÇO:\n', style: 'label' }, { text: clientData.address || 'N/A', style: 'value' }], colSpan: 2, border: [false, false, false, true] },
                {}
              ],
              [
                { text: [{ text: 'SOLICITANTE:\n', style: 'label' }, { text: solicitante, style: 'value' }], border: [false, false, false, false] },
                { text: [{ text: 'TELEFONE:\n', style: 'label' }, { text: os.contact.phone || 'N/A', style: 'value' }], border: [false, false, false, false] }
              ]
            ]
          },
          layout: {
            hLineColor: () => '#EEEEEE',
            paddingTop: () => 6,
            paddingBottom: () => 4
          }
        },

        // Equipment Section
        { 
          table: {
            widths: ['*'],
            body: [[{ text: 'DADOS DO EQUIPAMENTO', style: 'sectionTitle', fillColor: primaryColor }]]
          },
          margin: [0, 15, 0, 0],
          layout: 'noBorders'
        },
        {
          table: {
            widths: ['*', '*', '*'],
            body: [
              [
                { text: [{ text: 'EQUIPAMENTO / MODELO:\n', style: 'label' }, { text: os.equipment.manufacturer ? `${os.equipment.manufacturer} ${os.equipment.model}` : os.equipment.model, style: 'value' }], border: [false, false, false, true] },
                { text: [{ text: 'Nº SÉRIE:\n', style: 'label' }, { text: os.equipment.serialNumber || 'N/A', style: 'value' }], border: [false, false, false, true] },
                { text: [{ text: 'SETOR:\n', style: 'label' }, { text: os.equipment.sector || 'N/A', style: 'value' }], border: [false, false, false, true] }
              ],
              [
                { text: [{ text: 'LOCALIZAÇÃO / ENDEREÇO TÉCNICO:\n', style: 'label' }, { text: os.equipment.address || 'Mesmo do cliente', style: 'value' }], colSpan: 3, border: [false, false, false, false] },
                {}, {}
              ]
            ]
          },
          layout: {
            hLineColor: () => '#EEEEEE',
            paddingTop: () => 6,
            paddingBottom: () => 4
          }
        },

        // Defect Section
        { 
          table: {
            widths: ['*'],
            body: [[{ text: 'DESCRIÇÃO DO DEFEITO / SOLICITAÇÃO', style: 'sectionTitle', fillColor: primaryColor }]]
          },
          margin: [0, 15, 0, 0],
          layout: 'noBorders'
        },
        {
          text: os.defect || 'Nenhum defeito reportado',
          style: 'boxContent',
          margin: [0, 5, 0, 10]
        },

        // Meters Section
        { 
          table: {
            widths: ['*'],
            body: [[{ text: 'LEITURA DE CONTADORES', style: 'sectionTitle', fillColor: primaryColor }]]
          },
          margin: [0, 10, 0, 0],
          layout: 'noBorders'
        },
        {
          table: {
            widths: ['*', '*', '*'],
            body: [
              [
                { 
                  stack: [
                    { text: 'CONTADOR P&B', style: 'label', alignment: 'center' },
                    { text: meters.mono || '____________', style: 'meterValue', alignment: 'center' }
                  ],
                  fillColor: '#FAFAFA'
                },
                { 
                  stack: [
                    { text: 'CONTADOR COR', style: 'label', alignment: 'center' },
                    { text: meters.color || '____________', style: 'meterValue', alignment: 'center' }
                  ],
                  fillColor: '#FAFAFA'
                },
                { 
                  stack: [
                    { text: 'CONTADOR SCAN', style: 'label', alignment: 'center' },
                    { text: meters.scan || '____________', style: 'meterValue', alignment: 'center' }
                  ],
                  fillColor: '#FAFAFA'
                }
              ]
            ]
          },
          margin: [0, 5, 0, 10],
          layout: {
            hLineWidth: () => 1,
            vLineWidth: () => 1,
            hLineColor: () => '#EEEEEE',
            vLineColor: () => '#EEEEEE',
            paddingTop: () => 8,
            paddingBottom: () => 8
          }
        },

        // Technical Notes Section
        { 
          table: {
            widths: ['*'],
            body: [[{ text: 'RELATÓRIO TÉCNICO / PEÇAS SUBSTITUÍDAS', style: 'sectionTitle', fillColor: primaryColor }]]
          },
          margin: [0, 5, 0, 0],
          layout: 'noBorders'
        },
        {
          text: os.technicalNotes || '\n\n\n\n\n\n\n',
          style: 'boxContent',
          minHeight: 120
        },

        // Signatures Section
        {
          margin: [0, 50, 0, 0],
          columns: [
            {
              stack: [
                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1, lineColor: '#333333' }] },
                { text: 'ASSINATURA E CARIMBO DO CLIENTE', style: 'signatureLabel', margin: [0, 5, 0, 0] },
                { text: 'Data: ____/____/____', fontSize: 7, color: '#999' }
              ],
              alignment: 'center'
            },
            {
              stack: [
                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1, lineColor: '#333333' }] },
                { text: 'ASSINATURA DO TÉCNICO', style: 'signatureLabel', margin: [0, 5, 0, 0] },
                { text: attendantName, fontSize: 7, color: '#999' }
              ],
              alignment: 'center'
            }
          ]
        },
        {
          text: 'Declaro que os serviços acima foram executados a contento e os materiais/peças foram fornecidos conforme descrito.',
          style: 'footerNote',
          margin: [0, 30, 0, 0],
          alignment: 'center'
        }
      ],
      styles: {
        sectionTitle: { fontSize: 9, bold: true, color: '#FFFFFF', margin: [5, 4, 5, 4] },
        label: { fontSize: 7, color: '#777777', bold: true, margin: [0, 0, 0, 2] },
        value: { fontSize: 10, color: '#000000', bold: true },
        miniLabel: { fontSize: 6, color: '#EEEEEE', bold: true, alignment: 'center' },
        miniValue: { fontSize: 9, color: '#FFFFFF', bold: true, alignment: 'center' },
        boxContent: { fontSize: 10, lineHeight: 1.3, color: '#333333' },
        meterValue: { fontSize: 14, bold: true, color: primaryColor, margin: [0, 4, 0, 0] },
        signatureLabel: { fontSize: 8, color: '#333333', bold: true },
        footerNote: { fontSize: 7, italic: true, color: '#888888' },
        logoPlaceholder: { fontSize: 12, bold: true, color: '#CCCCCC', background: '#F9F9F9', alignment: 'center', margin: [0, 15] }
      },
      defaultStyle: { font: 'Roboto' }
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

    // Sincroniza os equipamentos do CRM para o contato
    const { syncCrmEquipmentsToEquipment } = require('../services/crmSyncService');
    await syncCrmEquipmentsToEquipment(tenantId, contactId);

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
