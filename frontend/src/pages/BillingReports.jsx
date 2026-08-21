import React, { useEffect, useState, useMemo } from 'react';
import { getBillingReports } from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  BarChart2,
  CheckCircle2,
  PhoneOff,
  UserX,
  Users,
  Clock,
  Filter,
  Printer,
  Download
} from 'lucide-react';

const PERIOD_OPTIONS = [
  { value: 1, label: 'Hoje' },
  { value: 7, label: '7 dias' },
  { value: 30, label: '30 dias' },
];

const STATUS_COLORS = {
  SUCCESS: 'var(--success, #10b981)',
  SKIPPED_OPTIN: 'var(--warning, #f59e0b)',
  SKIPPED_NOCONTACT: 'var(--danger, #ef4444)',
  FAILED: 'var(--text-muted, #94a3b8)',
  RECEIVED: 'var(--success, #10b981)',
  NOT_SENT: 'var(--danger, #ef4444)',
  NO_PHONE: 'var(--danger, #ef4444)',
  SKIPPED: 'var(--warning, #f59e0b)',
};

export default function BillingReports() {
  const [period, setPeriod] = useState(1);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ stats: null, logs: [], coverageAnalysis: [], coverageSummary: null });
  const [filterType, setFilterType] = useState('ALL');
  const [activeTab, setActiveTab] = useState('logs');

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  function handlePrint() {
    window.print();
  }

  async function loadData() {
    setLoading(true);
    try {
      const res = await getBillingReports(period);
      setData(res.data);
    } catch (err) {
      console.error('Erro ao buscar relatórios de cobrança:', err);
    } finally {
      setLoading(false);
    }
  }

  const chartData = useMemo(() => {
    if (!data.stats) return [];
    return [
      { name: 'Enviados com Sucesso', value: data.stats.success, color: STATUS_COLORS.SUCCESS },
      { name: 'Sem Opt-in (Caixinha)', value: data.stats.skippedOptIn, color: STATUS_COLORS.SKIPPED_OPTIN },
      { name: 'Sem Telefone', value: data.stats.skippedNoContact, color: STATUS_COLORS.SKIPPED_NOCONTACT },
      { name: 'Erro Técnico', value: data.stats.failed, color: STATUS_COLORS.FAILED },
    ].filter(d => d.value > 0);
  }, [data.stats]);

  const filteredLogs = useMemo(() => {
    if (filterType === 'ALL') return data.logs;
    if (filterType === 'SUCCESS') return data.logs.filter(l => l.status === 'SUCCESS');
    if (filterType === 'FAILED') return data.logs.filter(l => l.status === 'FAILED');
    if (filterType === 'SKIPPED_OPTIN') return data.logs.filter(l => l.status === 'SKIPPED' && l.errorMessage?.includes('Opt-in'));
    if (filterType === 'SKIPPED_NOCONTACT') return data.logs.filter(l => l.status === 'SKIPPED' && !l.errorMessage?.includes('Opt-in'));
    return data.logs;
  }, [data.logs, filterType]);

  if (loading && !data.stats) {
    return (
      <div style={s.container}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '60vh' }}>
          <div style={{ color: 'var(--text-muted)' }}>Carregando métricas...</div>
        </div>
      </div>
    );
  }

  const { stats } = data;
  const deliveryRate = stats?.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0;

  return (
    <div style={s.container} className="billing-report-container">
      <style>{`
        @media print {
          nav, header, .no-print { display: none !important; }
          .billing-report-container { padding: 0 !important; background: white !important; overflow: visible !important; }
          .billing-report-container, .billing-report-container .content, .billing-report-container .table-box { height: auto !important; min-height: 0 !important; overflow: visible !important; }
          .print-full { max-height: none !important; overflow: visible !important; border: none !important; }
          .main-section-print { display: block !important; grid-template-columns: 1fr !important; }
          table { width: 100% !important; border-collapse: collapse; }
          th, td { border-bottom: 1px solid #ccc !important; padding: 8px !important; color: #222 !important; background: #fff !important; }
          th { background: #f2f2f2 !important; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
          .coverage-summary { color: #111 !important; border-color: #bbb !important; }
          .coverage-summary span { display: block; font-size: 11px; color: #555 !important; }
          body { background: white !important; color: black !important; }
        }
      `}</style>
      <PageHeader
        title="Relatórios de Cobrança"
        subtitle="Analise a efetividade dos envios automáticos de boletos via WhatsApp."
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
            <button onClick={handlePrint} className="no-print" style={s.printBtn}>
              <Printer size={16} /> Salvar PDF
            </button>
            <div style={s.periodGroup} className="no-print">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                style={{ ...s.periodBtn, ...(period === opt.value ? s.periodBtnActive : {}) }}
                onClick={() => setPeriod(opt.value)}
              >
                {opt.label}
              </button>
            ))}
            </div>
          </div>
        }
      />

      <div style={s.content}>
        {/* KPIs */}
        <div style={s.kpiGrid} className="no-print">
          <div style={s.kpiCard}>
            <div style={s.kpiHeader}>
              <span style={s.kpiTitle}>Total Processado</span>
              <BarChart2 size={18} color="var(--primary)" />
            </div>
            <div style={s.kpiValue}>{stats?.total || 0}</div>
            <div style={s.kpiSub}>Boletos lidos pelo robô</div>
          </div>

          <div style={s.kpiCard}>
            <div style={s.kpiHeader}>
              <span style={s.kpiTitle}>Taxa de Entrega</span>
              <CheckCircle2 size={18} color={STATUS_COLORS.SUCCESS} />
            </div>
            <div style={{ ...s.kpiValue, color: STATUS_COLORS.SUCCESS }}>{deliveryRate}%</div>
            <div style={s.kpiSub}>{stats?.success || 0} entregues com sucesso</div>
          </div>

          <div style={s.kpiCard}>
            <div style={s.kpiHeader}>
              <span style={s.kpiTitle}>Base Opt-in CRM</span>
              <Users size={18} color="var(--accent, #3b82f6)" />
            </div>
            <div style={{ ...s.kpiValue, color: 'var(--accent, #3b82f6)' }}>{stats?.totalOptIn || 0}</div>
            <div style={s.kpiSub}>Total de clientes que aceitam cobrança no CRM</div>
          </div>

          <div style={s.kpiCard}>
            <div style={s.kpiHeader}>
              <span style={s.kpiTitle}>Sem Permissão (Falta Opt-in)</span>
              <UserX size={18} color={STATUS_COLORS.SKIPPED_OPTIN} />
            </div>
            <div style={{ ...s.kpiValue, color: STATUS_COLORS.SKIPPED_OPTIN }}>{stats?.skippedOptIn || 0}</div>
            <div style={s.kpiSub}>Caixinha desmarcada na hora do envio</div>
          </div>

          <div style={s.kpiCard}>
            <div style={s.kpiHeader}>
              <span style={s.kpiTitle}>Sem Telefone</span>
              <PhoneOff size={18} color={STATUS_COLORS.SKIPPED_NOCONTACT} />
            </div>
            <div style={{ ...s.kpiValue, color: STATUS_COLORS.SKIPPED_NOCONTACT }}>{stats?.skippedNoContact || 0}</div>
            <div style={s.kpiSub}>Contato não encontrado ou telefone em branco</div>
          </div>
        </div>

        <div style={s.mainSection} className="main-section-print">
          {/* Chart */}
          <div style={s.chartBox} className="no-print">
            <h3 style={s.boxTitle}>Distribuição dos Resultados</h3>
            {chartData.length > 0 ? (
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={chartData}
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => [`${value} boletos`, '']} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={s.emptyState}>Sem dados no período</div>
            )}
          </div>

          {/* Audit Table */}
          <div style={s.tableBox} className="table-box">
            <div style={{ ...s.tableHeader, borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }} className="no-print">
                <button 
                  style={activeTab === 'logs' ? s.tabActive : s.tabInactive} 
                  onClick={() => setActiveTab('logs')}
                >
                  Disparos (Logs)
                </button>
                <button 
                  style={activeTab === 'coverage' ? s.tabActive : s.tabInactive} 
                  onClick={() => setActiveTab('coverage')}
                >
                  Análise de Cobertura (Base x Enviados)
                </button>
              </div>
              <h3 style={s.boxTitle} className="only-print">Relatório de {activeTab === 'logs' ? 'Disparos' : 'Análise de Cobertura'}</h3>
              
              {activeTab === 'logs' && (
                <div style={s.filterGroup} className="no-print">
                  <Filter size={16} color="var(--text-muted)" />
                  <select
                    style={s.select}
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="ALL">Todos os Resultados</option>
                    <option value="SUCCESS">Somente Sucesso</option>
                    <option value="SKIPPED_OPTIN">Sem Opt-in (Caixinha)</option>
                    <option value="SKIPPED_NOCONTACT">Sem Contato/Telefone</option>
                    <option value="FAILED">Falha Técnica</option>
                  </select>
                </div>
              )}
            </div>

            {activeTab === 'coverage' && (
              <div style={s.coverageSummary} className="coverage-summary">
                <div style={s.coverageIntro}>
                  <strong>Conferência de cobertura</strong>
                  <span>Clientes com cobrança autorizada no CRM x envios concluídos no período</span>
                </div>
                <div style={s.coverageMetrics}>
                  <div style={s.coverageMetric}><strong>{data.coverageSummary?.expected || 0}</strong><span>Deveriam receber</span></div>
                  <div style={{ ...s.coverageMetric, color: STATUS_COLORS.RECEIVED }}><strong>{data.coverageSummary?.received || 0}</strong><span>Receberam</span></div>
                  <div style={{ ...s.coverageMetric, color: STATUS_COLORS.NOT_SENT }}><strong>{data.coverageSummary?.notReceived || 0}</strong><span>Não receberam</span></div>
                  <div style={{ ...s.coverageMetric, color: STATUS_COLORS.RECEIVED }}><strong>{data.coverageSummary?.rate || 0}%</strong><span>Cobertura</span></div>
                </div>
              </div>
            )}

            <div style={s.tableWrapper} className="print-full">
              <table style={s.table}>
                {activeTab === 'logs' ? (
                  <>
                    <thead>
                      <tr>
                        <th style={s.th}>Data / Hora</th>
                        <th style={s.th}>Cliente (CPF/CNPJ)</th>
                        <th style={s.th}>Status</th>
                        <th style={s.th}>Detalhe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map((log) => {
                        const isSuccess = log.status === 'SUCCESS';
                        const isSkipped = log.status === 'SKIPPED';
                        const isFailed = log.status === 'FAILED';
                        const isOptin = log.errorMessage?.includes('Opt-in');
                        const badgeColor = isSuccess ? STATUS_COLORS.SUCCESS : isFailed ? STATUS_COLORS.FAILED : (isOptin ? STATUS_COLORS.SKIPPED_OPTIN : STATUS_COLORS.SKIPPED_NOCONTACT);

                        return (
                          <tr key={log.id}>
                            <td style={s.tdTime}>
                              <Clock size={14} style={{ marginRight: '6px' }} className="no-print" />
                              {new Date(log.sentAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                            </td>
                            <td style={s.tdClient}>
                              <strong>{log.clientName || 'N/A'}</strong>
                              <br />
                              <span style={s.cnpj}>{log.cpfCnpj}</span>
                            </td>
                            <td style={s.td}>
                              <span style={{ ...s.badge, backgroundColor: badgeColor + '20', color: badgeColor }}>
                                {isSuccess ? 'Enviado' : isSkipped ? (isOptin ? 'Sem Permissão' : 'S/ Telefone') : 'Erro'}
                              </span>
                            </td>
                            <td style={s.tdMessage}>{log.errorMessage || 'Enviado para o WhatsApp com sucesso.'}</td>
                          </tr>
                        );
                      })}
                      {filteredLogs.length === 0 && (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            Nenhum registro encontrado para este filtro.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </>
                ) : (
                  <>
                    <thead>
                      <tr>
                        <th style={s.th}>Cliente</th>
                        <th style={s.th}>Telefone / WhatsApp</th>
                        <th style={s.th}>Envio no Período</th>
                        <th style={s.th}>Detalhe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.coverageAnalysis && data.coverageAnalysis.map((contact) => {
                        const badgeColor = STATUS_COLORS[contact.status] || STATUS_COLORS.FAILED;
                        return (
                          <tr key={contact.id}>
                            <td style={s.tdClient}>
                              <strong>{contact.name}</strong>
                              <br />
                              <span style={s.cnpj}>{contact.cpfCnpj}</span>
                            </td>
                            <td style={s.tdMessage}>
                              {contact.phone || 'Sem telefone'}
                            </td>
                            <td style={s.td}>
                              <span style={{ ...s.badge, backgroundColor: badgeColor + '20', color: badgeColor }}>
                                {contact.status === 'RECEIVED' ? '✓ Recebeu' : contact.status === 'NO_PHONE' ? 'Sem telefone' : contact.status === 'FAILED' ? 'Falha no envio' : 'Faltou enviar'}
                              </span>
                            </td>
                            <td style={s.tdMessage}>
                              {contact.status === 'RECEIVED' && contact.lastSentAt
                                ? `Enviado em ${new Date(contact.lastSentAt).toLocaleString('pt-BR')}`
                                : contact.lastError || (contact.status === 'NO_PHONE' ? 'Contato sem telefone cadastrado.' : 'Nenhum envio concluído no período.')}
                            </td>
                          </tr>
                        );
                      })}
                      {(!data.coverageAnalysis || data.coverageAnalysis.length === 0) && (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            Nenhum cliente com opt-in encontrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </>
                )}
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  container: {
    padding: 'var(--space-6)',
    background: 'var(--bg-base)',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflowY: 'auto'
  },
  periodGroup: {
    display: 'flex',
    gap: 'var(--space-2)',
    background: 'var(--bg-panel)',
    padding: 'var(--space-1)',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
  },
  periodBtn: {
    padding: 'var(--space-2) var(--space-4)',
    border: 'none',
    background: 'transparent',
    borderRadius: '8px',
    color: 'var(--text-muted)',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  periodBtnActive: {
    background: 'var(--primary)',
    color: '#fff',
  },
  content: {
    marginTop: 'var(--space-6)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-6)'
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 'var(--space-6)',
  },
  kpiCard: {
    background: 'var(--bg-panel)',
    padding: 'var(--space-5)',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
  },
  kpiHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--space-3)'
  },
  kpiTitle: {
    fontSize: '0.875rem',
    color: 'var(--text-muted)',
    fontWeight: 600
  },
  kpiValue: {
    fontSize: '2rem',
    fontWeight: 800,
    color: 'var(--text-color)',
    lineHeight: 1
  },
  kpiSub: {
    marginTop: 'var(--space-2)',
    fontSize: '0.75rem',
    color: 'var(--text-muted)'
  },
  mainSection: {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr',
    gap: 'var(--space-6)',
    alignItems: 'start'
  },
  chartBox: {
    background: 'var(--bg-panel)',
    padding: 'var(--space-6)',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
  },
  tableBox: {
    background: 'var(--bg-panel)',
    padding: 'var(--space-6)',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  coverageSummary: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 'var(--space-4)',
    padding: 'var(--space-4)',
    marginBottom: 'var(--space-4)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    background: 'var(--bg-base)',
  },
  coverageMetrics: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(80px, 1fr))',
    gap: 'var(--space-4)',
    textAlign: 'center',
  },
  coverageIntro: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  coverageMetric: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    fontSize: '0.75rem',
  },
  boxTitle: {
    margin: '0 0 var(--space-4) 0',
    fontSize: '1rem',
    fontWeight: 700
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--space-4)'
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    background: 'var(--bg-base)',
    padding: 'var(--space-1) var(--space-3)',
    borderRadius: '8px',
    border: '1px solid var(--border-color)'
  },
  select: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-color)',
    fontSize: '0.875rem',
    outline: 'none',
    cursor: 'pointer'
  },
  tableWrapper: {
    overflowX: 'auto',
    overflowY: 'auto',
    maxHeight: '400px',
    border: '1px solid var(--border-color)',
    borderRadius: '8px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '0.875rem'
  },
  th: {
    padding: 'var(--space-3) var(--space-4)',
    borderBottom: '1px solid var(--border-color)',
    color: 'var(--text-muted)',
    fontWeight: 600,
    background: 'var(--bg-base)',
    position: 'sticky',
    top: 0,
    zIndex: 1
  },
  td: {
    padding: 'var(--space-3) var(--space-4)',
    borderBottom: '1px solid var(--border-color)',
  },
  tdTime: {
    padding: 'var(--space-3) var(--space-4)',
    borderBottom: '1px solid var(--border-color)',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'nowrap'
  },
  tdClient: {
    padding: 'var(--space-3) var(--space-4)',
    borderBottom: '1px solid var(--border-color)',
    maxWidth: '200px'
  },
  cnpj: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: '2px',
    display: 'block'
  },
  tdMessage: {
    padding: 'var(--space-3) var(--space-4)',
    borderBottom: '1px solid var(--border-color)',
    color: 'var(--text-muted)',
    maxWidth: '250px'
  },
  badge: {
    padding: '4px 8px',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    whiteSpace: 'nowrap'
  },
  emptyState: {
    height: '200px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)'
  },
  printBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    background: 'white',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    color: 'var(--text-color)',
    fontWeight: 600,
    cursor: 'pointer'
  },
  tabActive: {
    padding: '8px 16px',
    background: 'var(--bg-base)',
    border: '1px solid var(--border-color)',
    borderBottom: '2px solid var(--primary)',
    color: 'var(--primary)',
    fontWeight: 700,
    cursor: 'pointer',
    borderRadius: '8px 8px 0 0'
  },
  tabInactive: {
    padding: '8px 16px',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: 'var(--text-muted)',
    fontWeight: 600,
    cursor: 'pointer'
  }
};
