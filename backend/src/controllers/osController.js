const prisma = require('../lib/prisma');
const PdfPrinter = require('pdfmake');
const path = require('path');
const fs = require('fs');

async function getEquipments(req, res) {
  const { contactId } = req.params;
  const equipments = await prisma.equipment.findMany({
    where: { contactId, tenantId: req.user.tenantId, isActive: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(equipments);
}

async function addEquipment(req, res) {
  const { contactId } = req.params;
  const { model, serialNumber, sector, address } = req.body;
  const equipment = await prisma.equipment.create({
    data: {
      tenantId: req.user.tenantId,
      contactId,
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
  const { model, serialNumber, sector, address, isActive } = req.body;
  const equipment = await prisma.equipment.update({
    where: { id },
    data: { model, serialNumber, sector, address, isActive }
  });
  res.json(equipment);
}

async function getOSList(req, res) {
  const orders = await prisma.serviceOrder.findMany({
    where: { tenantId: req.user.tenantId },
    include: {
      contact: { select: { id: true, name: true, phone: true } },
      equipment: true
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
  
  const data = { status, technicalNotes };
  if (meters) data.meters = JSON.stringify(meters);
  if (status === 'FINALIZADA') data.resolvedAt = new Date();

  const os = await prisma.serviceOrder.update({
    where: { id },
    data,
    include: { contact: true, equipment: true }
  });
  res.json(os);
}

async function generatePdf(req, res) {
  const { id } = req.params;
  const os = await prisma.serviceOrder.findFirst({
    where: { id, tenantId: req.user.tenantId },
    include: { contact: true, equipment: true }
  });

  if (!os) return res.status(404).json({ error: 'O.S. não encontrada' });

  // Criação do PDF usando pdfmake
  const fonts = {
    Helvetica: {
      normal: 'Helvetica',
      bold: 'Helvetica-Bold',
      italics: 'Helvetica-Oblique',
      bolditalics: 'Helvetica-BoldOblique'
    }
  };

  const printer = new PdfPrinter(fonts);
  const dataOS = os.createdAt.toLocaleDateString('pt-BR');
  const meters = os.meters ? JSON.parse(os.meters) : {};

  const docDefinition = {
    content: [
      { text: 'ORDEM DE SERVIÇO', style: 'header', alignment: 'center' },
      { text: `Número: ${os.id.substring(os.id.length - 6).toUpperCase()}   |   Data: ${dataOS}`, alignment: 'right', margin: [0, 0, 0, 10] },
      
      { text: 'DADOS DO CLIENTE', style: 'subheader' },
      {
        table: {
          widths: ['*', '*'],
          body: [
            ['Cliente: ' + (os.contact.name || 'N/A'), 'Telefone: ' + os.contact.phone],
            ['CNPJ: ' + (os.contact.cpfCnpj || 'N/A'), 'Endereço: ' + (os.contact.address || 'N/A')]
          ]
        },
        margin: [0, 0, 0, 10]
      },

      { text: 'DADOS DO EQUIPAMENTO', style: 'subheader' },
      {
        table: {
          widths: ['*', '*', '*'],
          body: [
            ['Modelo: ' + os.equipment.model, 'Série: ' + (os.equipment.serialNumber || 'N/A'), 'Setor: ' + (os.equipment.sector || 'N/A')],
            [{ text: 'Endereço: ' + (os.equipment.address || 'Mesmo do cliente'), colSpan: 3 }, {}, {}]
          ]
        },
        margin: [0, 0, 0, 10]
      },

      { text: 'DEFEITO REPORTADO', style: 'subheader' },
      { text: os.defect || 'Nenhum defeito reportado', margin: [0, 0, 0, 15] },

      { text: 'INTERVENÇÃO TÉCNICA / MEDIDORES', style: 'subheader' },
      {
        table: {
          widths: ['*', '*', '*'],
          body: [
            ['Total PB: ' + (meters.mono || '___'), 'Total Cor: ' + (meters.color || '___'), 'Total Scans: ' + (meters.scan || '___')],
          ]
        },
        margin: [0, 0, 0, 15]
      },

      { text: 'NOTAS DO TÉCNICO', style: 'subheader' },
      { text: os.technicalNotes || '____________________________________________________________________________________________________\n\n____________________________________________________________________________________________________\n\n', margin: [0, 0, 0, 30] },

      {
        table: {
          widths: ['*', '*'],
          body: [
            [
              { text: '\n\n_____________________________________\nAssinatura do Cliente', alignment: 'center', border: [false, false, false, false] },
              { text: '\n\n_____________________________________\nAssinatura do Técnico', alignment: 'center', border: [false, false, false, false] }
            ]
          ]
        }
      }
    ],
    styles: {
      header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
      subheader: { fontSize: 12, bold: true, margin: [0, 5, 0, 2], color: '#333333' }
    },
    defaultStyle: {
      font: 'Helvetica'
    }
  };

  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="OS_${os.id.substring(os.id.length - 6)}.pdf"`);
  
  pdfDoc.pipe(res);
  pdfDoc.end();
}

module.exports = { getEquipments, addEquipment, updateEquipment, getOSList, createOS, updateOS, generatePdf };
