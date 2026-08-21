const test = require('node:test');
const assert = require('node:assert/strict');
const { _private } = require('../src/controllers/billingController');

test('compara clientes com opt-in e envios por cliente, sem duplicar contatos', () => {
  const contacts = [
    { id: 'c1', name: 'Cliente A', cpfCnpj: '12.345.678/0001-90', phone: '5551999990001', whatsapp: null },
    { id: 'c1-duplicado', name: 'Cliente A - outra instancia', cpfCnpj: '12345678000190', phone: '5551999990002', whatsapp: null },
    { id: 'c2', name: 'Cliente B', cpfCnpj: '98.765.432/0001-10', phone: '', whatsapp: null },
    { id: 'c3', name: 'Cliente C', cpfCnpj: '11.222.333/0001-44', phone: '5551999990003', whatsapp: null },
  ];
  const logs = [
    { cpfCnpj: '12345678000190', status: 'SUCCESS', sentAt: '2026-08-21T10:00:00Z' },
    { cpfCnpj: '11222333000144', status: 'FAILED', sentAt: '2026-08-21T10:05:00Z', errorMessage: 'Falha técnica' },
  ];

  const report = _private.buildBillingCoverageReport(contacts, logs);
  assert.deepEqual(report.coverageSummary, {
    expected: 3,
    received: 1,
    notReceived: 2,
    notSent: 0,
    noPhone: 1,
    failed: 1,
    skipped: 0,
    rate: 33,
  });
  assert.equal(report.coverageAnalysis.find((item) => item.name === 'Cliente A').status, 'RECEIVED');
  assert.equal(report.coverageAnalysis.find((item) => item.name === 'Cliente B').status, 'NO_PHONE');
  assert.equal(report.coverageAnalysis.find((item) => item.name === 'Cliente C').status, 'FAILED');
});
