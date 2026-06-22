import React, { useEffect, useState } from 'react';
import { 
  getRevenueStats, 
  getRevenueBenchmark, 
  getRevenueDetective, 
  getAuditedTickets, 
  auditTicket 
} from '../services/api';
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell
} from 'recharts';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Coins, 
  TrendingUp, 
  Zap, 
  Building2, 
  Users, 
  Search, 
  CheckCircle,
  Play,
  RotateCw,
  Award
} from 'lucide-react';
import { toast } from '../utils/toast';

export default function RevGuard() {
  const [activeTab, setActiveTab] = useState(0);
  
  // States para cada aba
  const [crisisData, setCrisisData] = useState(null);
  const [benchmarkData, setBenchmarkData] = useState(null);
  const [detectiveData, setDetectiveData] = useState(null);
  const [auditList, setAuditList] = useState([]);
  
  // Loading states
  const [loadingCrisis, setLoadingCrisis] = useState(true);
  const [loadingBenchmark, setLoadingBenchmark] = useState(false);
  const [loadingDetective, setLoadingDetective] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditingTicketId, setAuditingTicketId] = useState(null);
  
  // Ticket selecionado para auditoria
  const [selectedTicket, setSelectedTicket] = useState(null);

  useEffect(() => {
    loadCrisis();
  }, []);

  useEffect(() => {
    if (activeTab === 0) loadCrisis();
    if (activeTab === 2) loadBenchmark();
    if (activeTab === 3) loadDetective();
    if (activeTab === 4) loadAuditList();
  }, [activeTab]);

  async function loadCrisis() {
    setLoadingCrisis(true);
    try {
      const res = await getRevenueStats();
      setCrisisData(res.data);
    } catch (error) {
      console.error('Erro ao carregar dados do RevGuard:', error);
      toast.error('Erro ao carregar dados de receita.');
    } finally {
      setLoadingCrisis(false);
    }
  }

  async function loadBenchmark() {
    setLoadingBenchmark(true);
    try {
      const res = await getRevenueBenchmark();
      setBenchmarkData(res.data);
    } catch (error) {
      console.error('Erro ao carregar benchmark:', error);
      toast.error('Erro ao carregar benchmark.');
    } finally {
      setLoadingBenchmark(false);
    }
  }

  async function loadDetective() {
    setLoadingDetective(true);
    try {
      const res = await getRevenueDetective();
      setDetectiveData(res.data);
    } catch (error) {
      console.error('Erro ao carregar detetive:', error);
      toast.error('Erro ao carregar detetive.');
    } finally {
      setLoadingDetective(false);
    }
  }

  async function loadAuditList() {
    setLoadingAudit(true);
    try {
      const res = await getAuditedTickets();
      setAuditList(res.data);
      if (selectedTicket) {
        // Atualiza o ticket selecionado caso ele já estivesse aberto
        const updated = res.data.find(t => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    } catch (error) {
      console.error('Erro ao carregar atendimentos:', error);
      toast.error('Erro ao carregar atendimentos.');
    } finally {
      setLoadingAudit(false);
    }
  }

  async function handleAudit(ticketId) {
    setAuditingTicketId(ticketId);
    try {
      toast.info('IA analisando conversa... Isso pode levar alguns segundos.');
      const res = await auditTicket(ticketId);
      toast.success('Auditoria concluída com sucesso!');
      
      // Recarrega a lista
      await loadAuditList();
      
      // Atualiza o painel lateral com os resultados novos mesclando dados anteriores
      setSelectedTicket(prev => {
        if (!prev) return res.data;
        return {
          ...prev,
          auditScore: res.data.auditScore,
          auditResult: res.data.auditResult,
          auditedAt: res.data.auditedAt
        };
      });
    } catch (error) {
      const message = error.response?.data?.error || error.message || 'Falha na análise.';
      toast.error(`Erro ao auditar: ${message}`);
    } finally {
      setAuditingTicketId(null);
    }
  }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const renderMarkdown = (txt) => {
    if (!txt) return null;
    return txt.split('\n').map((line, i) => {
      if (line.startsWith('### ')) {
        return <h3 key={i} style={{ fontSize: '0.95rem', fontWeight: 800, margin: '14px 0 6px 0', color: 'var(--accent)' }}>{line.slice(4)}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={i} style={{ fontSize: '1.05rem', fontWeight: 800, margin: '18px 0 8px 0', color: 'var(--accent)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>{line.slice(3)}</h2>;
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={i} style={{ fontSize: '0.85rem', margin: '4px 0 4px 12px', listStyleType: 'disc', color: 'var(--text-muted)' }}>{line.slice(2)}</li>;
      }
      const parts = line.split('**');
      if (parts.length > 1) {
        return (
          <p key={i} style={{ fontSize: '0.85rem', margin: '6px 0', lineHeight: 1.5, color: 'var(--text-muted)' }}>
            {parts.map((p, idx) => idx % 2 === 1 ? <strong key={idx} style={{ color: 'var(--text-main)', fontWeight: 700 }}>{p}</strong> : p)}
          </p>
        );
      }
      return <p key={i} style={{ fontSize: '0.85rem', margin: '6px 0', lineHeight: 1.5, color: 'var(--text-muted)' }}>{line}</p>;
    });
  };

  const TABS = ['Centro de Crise', 'Vazamento do Funil', 'Benchmark Interno', 'Detetive IA', 'Auditoria por IA'];

  return (
    <div style={s.container}>
      <header style={s.header}>
        <div style={s.headerInfo}>
          <div style={s.kickerGroup}>
            <span style={s.kicker}>RevGuard AI</span>
            <span style={s.intelligenceBadge}>Módulo Revenue Intelligence</span>
          </div>
          <h1 style={s.title}>Painel de Inteligência de Receita</h1>
          <p style={s.subtitle}>Monitore SLAs técnicos, gargalos operacionais e audite atendimentos automaticamente.</p>
        </div>
        <div style={s.statusBadge}>
          <span style={s.dot} /> Monitoramento Ativo
        </div>
      </header>

      {/* Navegação de Abas */}
      <div style={s.tabs}>
        {TABS.map((tabName, index) => (
          <button 
            key={tabName} 
            style={{ ...s.tab, ...(activeTab === index ? s.tabActive : {}) }} 
            onClick={() => setActiveTab(index)}
          >
            {tabName}
          </button>
        ))}
      </div>

      {/* ABA 0: CENTRO DE CRISE */}
      {activeTab === 0 && (
        loadingCrisis ? (
          <div style={s.loadingBox}>
            <div style={s.spinner} /> Carregando centro de crise...
          </div>
        ) : !crisisData ? (
          <div style={s.errorBox}>Erro ao carregar dados do RevGuard.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* KPI Grid */}
            <div style={s.kpiGrid}>
              <div style={s.riskCard}>
                <div style={s.riskCardHeader}>
                  <AlertTriangle color="#ef4444" size={24} style={s.pulseAlert} />
                  <span style={s.riskLabel}>Receita em Risco Hoje</span>
                </div>
                <div style={s.riskValue}>{formatCurrency(crisisData.receitaEmRiscoHoje)}</div>
                <p style={s.riskHint}>
                  Soma do MRR sob quebra de SLA ({crisisData.kpis.kpiSlaLimitHours}h+) e orçamentos avulsos parados.
                </p>
              </div>

              <div style={s.kpiCard}>
                <div style={{ ...s.kpiIcon, color: '#3b82f6' }}><Coins size={22} /></div>
                <div style={s.kpiContent}>
                  <span style={s.kpiLabel}>Locações Sob Risco (MRR)</span>
                  <span style={s.kpiValue}>{formatCurrency(crisisData.mrrInRisk)}</span>
                  <span style={s.kpiHint}>Baseado em {formatCurrency(crisisData.kpis.kpiContractValue)} de mensalidade média</span>
                </div>
              </div>

              <div style={s.kpiCard}>
                <div style={{ ...s.kpiIcon, color: '#f59e0b' }}><Zap size={22} /></div>
                <div style={s.kpiContent}>
                  <span style={s.kpiLabel}>Orçamentos Avulsos Parados</span>
                  <span style={s.kpiValue}>{formatCurrency(crisisData.stalledEstimates)}</span>
                  <span style={s.kpiHint}>Baseado em {formatCurrency(crisisData.kpis.kpiServiceValue)} por O.S. avulsa</span>
                </div>
              </div>
            </div>

            {/* Main Grid: Gargalos e Mini-Funil */}
            <div style={s.mainGrid}>
              {/* Gargalos */}
              <div style={s.chartSection}>
                <div style={s.sectionHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldAlert size={20} color="var(--accent)" />
                    <h2 style={s.sectionTitle}>Gargalos Críticos Identificados</h2>
                  </div>
                </div>
                <div style={s.causesList}>
                  {crisisData.causas.map((causa) => (
                    <div key={causa.id} style={s.causeRow}>
                      <div style={s.causeInfo}>
                        <span style={{ 
                          ...s.priorityDot, 
                          background: causa.prioridade === 'alta' ? '#ef4444' : '#f59e0b',
                          boxShadow: causa.prioridade === 'alta' ? '0 0 8px rgba(239,68,68,0.5)' : '0 0 8px rgba(245,158,11,0.5)'
                        }} />
                        <span style={s.causeText}>{causa.descricao}</span>
                      </div>
                      <div style={s.causeStats}>
                        <span style={s.causeCount}>{causa.quantidade}</span>
                        <span style={s.causeSub}>Ocorrências</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mini-Funil */}
              <div style={s.chartSection}>
                <div style={s.sectionHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingUp size={20} color="#10b981" />
                    <h2 style={s.sectionTitle}>Conversão de Chamados (Últimos 30 dias)</h2>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center', height: '100%' }}>
                  <div style={s.miniFunnelRow}>
                    <span>Novos Chamados:</span>
                    <strong>{crisisData.funnel.novosChamados}</strong>
                  </div>
                  <div style={s.miniFunnelRow}>
                    <span>Em Atendimento:</span>
                    <strong>{crisisData.funnel.emAtendimento}</strong>
                  </div>
                  <div style={s.miniFunnelRow}>
                    <span>Aguardando Aprovação:</span>
                    <strong>{crisisData.funnel.aguardandoCliente}</strong>
                  </div>
                  <div style={s.miniFunnelRow}>
                    <span>Finalizadas no Mês:</span>
                    <strong>{crisisData.funnel.finalizadosMes}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* ABA 1: VAZAMENTO DO FUNIL */}
      {activeTab === 1 && (
        loadingCrisis ? (
          <div style={s.loadingBox}><div style={s.spinner} /> Carregando funil...</div>
        ) : !crisisData ? (
          <div style={s.errorBox}>Erro ao carregar dados do funil.</div>
        ) : (
          <div style={s.chartSection}>
            <div style={s.sectionHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={20} color="#10b981" />
                <h2 style={s.sectionTitle}>Pipeline e Vazamento de Ordens de Serviço</h2>
              </div>
              <span style={s.badge}>Leitura do PostgreSQL</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', marginTop: '1rem' }}>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={[
                      { name: 'Novas O.S.', value: crisisData.funnel.novosChamados, fill: '#8b5cf6' },
                      { name: 'Em Atendimento', value: crisisData.funnel.emAtendimento, fill: '#3b82f6' },
                      { name: 'Aguardando Aprovação', value: crisisData.funnel.aguardandoCliente, fill: '#f59e0b' },
                      { name: 'Finalizadas', value: crisisData.funnel.finalizadosMes, fill: '#10b981' }
                    ]} 
                    barSize={45}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-main)' }}
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {[
                        <Cell key="0" fill="#8b5cf6" />,
                        <Cell key="1" fill="#3b82f6" />,
                        <Cell key="2" fill="#f59e0b" />,
                        <Cell key="3" fill="#10b981" />
                      ]}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>Análise de Conversão & Perdas</h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  O gráfico de funil reflete os chamados de assistência técnica cadastrados na clínica.
                </p>
                <div style={{ ...s.causeRow, background: 'rgba(245,158,11,0.04)', borderColor: 'rgba(245,158,11,0.2)' }}>
                  <div>
                    <strong style={{ color: '#f59e0b', fontSize: '0.88rem', display: 'block' }}>Aguardando Cliente</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Orçamentos de manutenção sem aprovação</span>
                  </div>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>{crisisData.funnel.aguardandoCliente}</strong>
                </div>
                <div style={{ ...s.causeRow, background: 'rgba(16,185,129,0.04)', borderColor: 'rgba(16,185,129,0.2)' }}>
                  <div>
                    <strong style={{ color: '#10b981', fontSize: '0.88rem', display: 'block' }}>Taxa de Resolução</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>O.S. finalizadas nos últimos 30 dias</span>
                  </div>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>{crisisData.funnel.finalizadosMes}</strong>
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* ABA 2: BENCHMARK INTERNO */}
      {activeTab === 2 && (
        loadingBenchmark ? (
          <div style={s.loadingBox}><div style={s.spinner} /> Carregando benchmark...</div>
        ) : !benchmarkData ? (
          <div style={s.errorBox}>Erro ao carregar benchmark.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Clientes */}
            <div style={s.chartSection}>
              <div style={s.sectionHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={20} color="var(--accent)" />
                  <h2 style={s.sectionTitle}>Benchmark por Clientes (Top 10)</h2>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Cliente</th>
                      <th style={{ ...s.th, textAlign: 'center' }}>Total O.S.</th>
                      <th style={{ ...s.th, textAlign: 'center' }}>SLA Médio (h)</th>
                      <th style={{ ...s.th, textAlign: 'center' }}>CSAT Médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {benchmarkData.clientes.map((c) => (
                      <tr key={c.id} style={s.tr}>
                        <td style={{ ...s.td, fontWeight: 700 }}>{c.nome}</td>
                        <td style={{ ...s.td, textAlign: 'center' }}>{c.osCount}</td>
                        <td style={{ ...s.td, textAlign: 'center', color: c.avgSla > 24 ? '#ef4444' : 'var(--text-main)' }}>
                          {c.avgSla ? `${c.avgSla}h` : '--'}
                        </td>
                        <td style={{ ...s.td, textAlign: 'center', fontWeight: 'bold', color: c.avgCsat && c.avgCsat <= 3.0 ? '#ef4444' : '#10b981' }}>
                          {c.avgCsat ? `★ ${c.avgCsat}` : '--'}
                        </td>
                      </tr>
                    ))}
                    {benchmarkData.clientes.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ ...s.td, textAlign: 'center', color: 'var(--text-dim)' }}>Nenhum dado de cliente para comparar.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Atendentes */}
            <div style={s.chartSection}>
              <div style={s.sectionHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={20} color="#3b82f6" />
                  <h2 style={s.sectionTitle}>Performance de Atendentes</h2>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Atendente</th>
                      <th style={{ ...s.th, textAlign: 'center' }}>O.S. Feitas</th>
                      <th style={{ ...s.th, textAlign: 'center' }}>SLA Médio (h)</th>
                      <th style={{ ...s.th, textAlign: 'center' }}>CSAT Médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {benchmarkData.atendentes.map((a) => (
                      <tr key={a.id} style={s.tr}>
                        <td style={{ ...s.td, fontWeight: 700 }}>{a.nome}</td>
                        <td style={{ ...s.td, textAlign: 'center' }}>{a.osCount}</td>
                        <td style={{ ...s.td, textAlign: 'center' }}>{a.avgSla ? `${a.avgSla}h` : '--'}</td>
                        <td style={{ ...s.td, textAlign: 'center', fontWeight: 'bold', color: a.avgCsat && a.avgCsat <= 3.0 ? '#ef4444' : '#10b981' }}>
                          {a.avgCsat ? `★ ${a.avgCsat}` : '--'}
                        </td>
                      </tr>
                    ))}
                    {benchmarkData.atendentes.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ ...s.td, textAlign: 'center', color: 'var(--text-dim)' }}>Nenhum atendente ativo registrado.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      )}

      {/* ABA 3: DETETIVE IA */}
      {activeTab === 3 && (
        loadingDetective ? (
          <div style={s.loadingBox}><div style={s.spinner} /> Detetive analisando histórico...</div>
        ) : !detectiveData ? (
          <div style={s.errorBox}>Erro ao carregar Detetive IA.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Quadro comparativo */}
            <div style={s.detectiveGrid}>
              <div style={s.detectiveCard}>
                <h3 style={s.detectiveCardTitle}>Novos Chamados</h3>
                <div style={s.detectiveCardValue}>
                  {detectiveData.stats.atual.tickets}
                  <span style={{ 
                    ...s.diffBadge, 
                    color: detectiveData.stats.atual.tickets >= detectiveData.stats.anterior.tickets ? '#ef4444' : '#10b981'
                  }}>
                    {detectiveData.stats.atual.tickets >= detectiveData.stats.anterior.tickets ? '▲' : '▼'} vs {detectiveData.stats.anterior.tickets}
                  </span>
                </div>
              </div>
              <div style={s.detectiveCard}>
                <h3 style={s.detectiveCardTitle}>Ordens de Serviço</h3>
                <div style={s.detectiveCardValue}>
                  {detectiveData.stats.atual.os}
                  <span style={{ 
                    ...s.diffBadge, 
                    color: detectiveData.stats.atual.os >= detectiveData.stats.anterior.os ? '#3b82f6' : 'var(--text-muted)'
                  }}>
                    vs {detectiveData.stats.anterior.os}
                  </span>
                </div>
              </div>
              <div style={s.detectiveCard}>
                <h3 style={s.detectiveCardTitle}>Chamados Fora do SLA</h3>
                <div style={s.detectiveCardValue}>
                  {detectiveData.stats.atual.overdue}
                  <span style={{ 
                    ...s.diffBadge, 
                    color: detectiveData.stats.atual.overdue > detectiveData.stats.anterior.overdue ? '#ef4444' : '#10b981'
                  }}>
                    {detectiveData.stats.atual.overdue > detectiveData.stats.anterior.overdue ? '▲' : '▼'} vs {detectiveData.stats.anterior.overdue}
                  </span>
                </div>
              </div>
              <div style={s.detectiveCard}>
                <h3 style={s.detectiveCardTitle}>CSAT Médio</h3>
                <div style={s.detectiveCardValue}>
                  ★ {detectiveData.stats.atual.csat}
                  <span style={{ 
                    ...s.diffBadge, 
                    color: detectiveData.stats.atual.csat >= detectiveData.stats.anterior.csat ? '#10b981' : '#ef4444'
                  }}>
                    vs ★ {detectiveData.stats.anterior.csat}
                  </span>
                </div>
              </div>
            </div>

            {/* Diagnóstico da IA */}
            <div style={{ ...s.chartSection, background: 'rgba(139,92,246,0.03)', borderColor: 'rgba(139,92,246,0.15)' }}>
              <div style={s.sectionHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Search size={22} color="var(--accent)" />
                  <h2 style={{ ...s.sectionTitle, color: 'var(--accent)' }}>Diagnóstico do Detetive IA</h2>
                </div>
              </div>
              <div style={s.diagnosisContent}>
                {renderMarkdown(detectiveData.diagnosis)}
              </div>
            </div>
          </div>
        )
      )}

      {/* ABA 4: AUDITORIA IA */}
      {activeTab === 4 && (
        loadingAudit ? (
          <div style={s.loadingBox}><div style={s.spinner} /> Carregando atendimentos para auditoria...</div>
        ) : (
          <div style={s.auditGrid}>
            {/* Lista de Atendimentos */}
            <div style={s.chartSection}>
              <div style={s.sectionHeader}>
                <h2 style={s.sectionTitle}>Atendimentos Finalizados Recentes</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '450px', overflowY: 'auto' }}>
                {auditList.map((ticket) => {
                  const isSelected = selectedTicket?.id === ticket.id;
                  return (
                    <div 
                      key={ticket.id} 
                      style={{ 
                        ...s.auditRow, 
                        borderColor: isSelected ? 'var(--accent)' : 'var(--border-color)',
                        background: isSelected ? 'var(--accent-light)' : 'var(--bg-base)'
                      }}
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{ticket.contactName}</strong>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Atendente: {ticket.agentName}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Finalizado em: {new Date(ticket.resolvedAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        {ticket.rating && (
                          <span style={s.csatBadge}>★ {ticket.rating}</span>
                        )}
                        {ticket.auditScore !== null ? (
                          <span style={{ ...s.scoreBadge, background: ticket.auditScore >= 80 ? 'rgba(16,185,129,0.1)' : ticket.auditScore >= 50 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', color: ticket.auditScore >= 80 ? '#10b981' : ticket.auditScore >= 50 ? '#f59e0b' : '#ef4444' }}>
                            Nota: {ticket.auditScore}
                          </span>
                        ) : (
                          <span style={s.pendingAuditBadge}>Não Auditado</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {auditList.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem', padding: '2rem 0' }}>
                    Nenhum atendimento resolvido recente encontrado para auditoria.
                  </p>
                )}
              </div>
            </div>

            {/* Painel de Auditoria Detalhado */}
            <div style={s.chartSection}>
              {selectedTicket ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
                  <div style={s.auditDetailHeader}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: '12px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>{selectedTicket.contactName}</h3>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>ID: {selectedTicket.id}</span>
                      </div>
                      
                      <button 
                        style={s.auditBtn} 
                        disabled={auditingTicketId !== null} 
                        onClick={() => handleAudit(selectedTicket.id)}
                      >
                        {auditingTicketId === selectedTicket.id ? (
                          <><RotateCw size={14} className="animate-spin" /> Analisando...</>
                        ) : (
                          <><Play size={14} /> Auditar com IA</>
                        )}
                      </button>
                    </div>

                    <div style={s.metadataGrid}>
                      <div style={s.metadataItem}>
                        <span style={s.metadataLabel}>Atendente</span>
                        <span style={s.metadataValue}>{selectedTicket.agentName}</span>
                      </div>
                      <div style={s.metadataItem}>
                        <span style={s.metadataLabel}>Iniciado em</span>
                        <span style={s.metadataValue}>
                          {new Date(selectedTicket.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                      <div style={s.metadataItem}>
                        <span style={s.metadataLabel}>Finalizado em</span>
                        <span style={s.metadataValue}>
                          {new Date(selectedTicket.resolvedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                      <div style={s.metadataItem}>
                        <span style={s.metadataLabel}>CSAT Cliente</span>
                        <span style={{ 
                          ...s.metadataValue, 
                          color: selectedTicket.rating ? '#10b981' : 'var(--text-dim)',
                          fontWeight: selectedTicket.rating ? 'bold' : 'normal'
                        }}>
                          {selectedTicket.rating ? `★ ${selectedTicket.rating}/5` : 'Não avaliado'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedTicket.auditScore !== null ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', maxHeight: '380px', paddingRight: '4px' }}>
                      {/* Score card */}
                      <div style={s.auditScorePanel}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            ...s.scoreCircle,
                            borderColor: selectedTicket.auditScore >= 80 ? '#10b981' : selectedTicket.auditScore >= 50 ? '#f59e0b' : '#ef4444'
                          }}>
                            {selectedTicket.auditScore}
                          </div>
                          <div>
                            <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)', display: 'block' }}>Avaliação de Conformidade</strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Auditoria executada em: {new Date(selectedTicket.auditedAt).toLocaleString('pt-BR')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Relatório Markdown */}
                      <div style={s.reportBox}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: 'var(--accent)' }}>
                          <Award size={16} />
                          <strong style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Parecer da Auditoria</strong>
                        </div>
                        {renderMarkdown(selectedTicket.auditResult)}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '12px', textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>
                      <ShieldAlert size={40} color="var(--text-dim)" />
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.88rem', color: 'var(--text-muted)' }}>Atendimento Sem Auditoria</strong>
                        <span style={{ fontSize: '0.78rem' }}>Clique em "Auditar com IA" no topo para analisar a conduta deste atendimento.</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '8px', color: 'var(--text-dim)', textAlign: 'center', minHeight: '300px' }}>
                  <Users size={32} />
                  <span style={{ fontSize: '0.82rem' }}>Selecione um chamado na lista ao lado para inspecionar e auditar.</span>
                </div>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}

const s = {
  container: { padding: '2rem', background: 'var(--bg-base)', flex: 1, overflowY: 'auto', color: 'var(--text-main)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' },
  headerInfo: { display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  kickerGroup: { display: 'flex', alignItems: 'center', gap: '8px' },
  kicker: { color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' },
  intelligenceBadge: { background: 'var(--accent-light)', color: 'var(--accent)', fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' },
  title: { fontSize: '1.75rem', fontWeight: 800, margin: '4px 0 0 0', letterSpacing: '-0.02em', fontFamily: 'var(--font-display)' },
  subtitle: { color: 'var(--text-muted)', fontSize: '0.88rem' },
  statusBadge: { background: 'var(--bg-panel)', border: '1px solid var(--border-color)', padding: '0.55rem 0.95rem', borderRadius: '100px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' },
  dot: { width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px rgba(16,185,129,0.4)' },
  
  tabs: { display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem', overflowX: 'auto', scrollbarWidth: 'none' },
  tab: { padding: '0.8rem 1.1rem', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-muted)', borderBottom: '2px solid transparent', transition: 'all 0.2s', fontWeight: 600, whiteSpace: 'nowrap' },
  tabActive: { color: 'var(--accent)', borderBottom: '2px solid var(--accent)', fontWeight: 800 },

  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' },
  riskCard: { background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: '24px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '10px' },
  riskCardHeader: { display: 'flex', alignItems: 'center', gap: '8px' },
  pulseAlert: { animation: 'pulse-alert 2s infinite' },
  riskLabel: { color: '#ef4444', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' },
  riskValue: { fontSize: '2.1rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.02em' },
  riskHint: { color: 'var(--text-muted)', fontSize: '0.75rem', margin: 0, lineHeight: 1.4 },
  
  kpiCard: { background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' },
  kpiIcon: { background: 'var(--bg-base)', padding: '0.7rem', borderRadius: '14px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  kpiContent: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  kpiLabel: { color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' },
  kpiValue: { fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main)' },
  kpiHint: { color: 'var(--text-dim)', fontSize: '0.72rem' },

  mainGrid: { display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap' },
  chartSection: { background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: '0.98rem', fontWeight: 800, margin: 0, fontFamily: 'var(--font-display)', color: 'var(--text-main)' },
  badge: { background: 'var(--bg-base)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px', borderRadius: '100px' },
  
  causesList: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  causeRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.9rem 1.1rem', borderRadius: '16px', background: 'var(--bg-base)', border: '1px solid var(--border-color)', transition: 'transform 0.2s ease' },
  causeInfo: { display: 'flex', alignItems: 'center', gap: '10px' },
  priorityDot: { width: '8px', height: '8px', borderRadius: '50%' },
  causeText: { fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' },
  causeStats: { textAlign: 'right' },
  causeCount: { fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', display: 'block' },
  causeSub: { fontSize: '0.62rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' },
  emptyHint: { color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 },

  miniFunnelRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-base)', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '0.82rem' },
  
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' },
  th: { padding: '10px', borderBottom: '2px solid var(--border-color)', color: 'var(--text-dim)', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em', textAlign: 'left' },
  tr: { borderBottom: '1px solid var(--border-color)', hover: { background: 'var(--bg-base)' } },
  td: { padding: '12px 10px', color: 'var(--text-main)', fontSize: '0.82rem' },

  detectiveGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' },
  detectiveCard: { background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '18px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '8px' },
  detectiveCardTitle: { margin: 0, fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' },
  detectiveCardValue: { fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-main)', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' },
  diffBadge: { fontSize: '0.7rem', fontWeight: 700, marginLeft: '8px' },
  diagnosisContent: { fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 },

  auditGrid: { display: 'grid', gridTemplateColumns: '1.1fr 1.3fr', gap: '1.5rem' },
  auditRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', borderRadius: '16px', border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'all 0.2s ease' },
  csatBadge: { background: 'rgba(16,185,129,0.08)', color: '#10b981', fontSize: '0.7rem', fontWeight: 800, padding: '2px 6px', borderRadius: '6px' },
  scoreBadge: { fontSize: '0.7rem', fontWeight: 800, padding: '2px 6px', borderRadius: '6px' },
  pendingAuditBadge: { background: 'var(--bg-base)', border: '1px solid var(--border-color)', color: 'var(--text-dim)', fontSize: '0.68rem', padding: '2px 6px', borderRadius: '6px' },
  auditBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', padding: '0.45rem 0.85rem', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.2s' },
  auditScorePanel: { padding: '1rem', background: 'var(--bg-base)', border: '1px solid var(--border-color)', borderRadius: '16px' },
  scoreCircle: { width: '48px', height: '48px', borderRadius: '50%', border: '4px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-main)' },
  reportBox: { background: 'var(--bg-base)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.25rem' },
  
  auditDetailHeader: {
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '16px',
    marginBottom: '12px'
  },
  metadataGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    marginTop: '12px',
    background: 'var(--bg-base)',
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid var(--border-color)'
  },
  metadataItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  metadataLabel: {
    fontSize: '0.65rem',
    fontWeight: 800,
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  metadataValue: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--text-main)'
  },

  loadingBox: { display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: 'var(--text-muted)', fontSize: '0.85rem' },
  spinner: { width: '28px', height: '28px', borderRadius: '50%', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent)', animation: 'spin-sk 1s infinite linear' },
  errorBox: { padding: '2rem', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '18px', color: '#ef4444', fontSize: '0.85rem', textAlign: 'center' }
};

// Adiciona estilos globais para as animações
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.innerHTML = `
    @keyframes spin-sk {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes pulse-alert {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.15); opacity: 0.8; }
    }
    .animate-spin {
      animation: spin-sk 1s infinite linear;
    }
  `;
  document.head.appendChild(styleEl);
}
