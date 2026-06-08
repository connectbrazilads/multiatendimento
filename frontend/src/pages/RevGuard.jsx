import React, { useEffect, useState } from 'react';
import { getRevenueStats } from '../services/api';
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
import { AlertTriangle, ShieldAlert, Coins, TrendingUp, Zap, HelpCircle } from 'lucide-react';
import { toast } from '../utils/toast';

export default function RevGuard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await getRevenueStats();
      setData(res.data);
    } catch (error) {
      console.error('Erro ao carregar dados do RevGuard:', error);
      toast.error('Erro ao carregar os dados de receita.');
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  if (loading) {
    return (
      <div style={{ padding: '2.5rem', background: 'var(--bg-base)', flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
          {[1, 2, 3].map((item) => (
            <div key={item} style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '1.5rem', height: '110px' }}>
              <div style={{ height: '12px', width: '60%', background: 'var(--bg-base)', borderRadius: '6px', marginBottom: '16px', animation: 'pulse-sk 1.5s infinite' }} />
              <div style={{ height: '28px', width: '40%', background: 'var(--bg-base)', borderRadius: '6px', animation: 'pulse-sk 1.5s infinite' }} />
            </div>
          ))}
        </div>
        <style>{`
          @keyframes pulse-sk {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 0.8; }
          }
        `}</style>
      </div>
    );
  }

  if (!data) {
    return <div style={s.loading}>Erro ao carregar dados do RevGuard AI.</div>;
  }

  const { receitaEmRiscoHoje, mrrInRisk, stalledEstimates, causas, funnel, kpis } = data;

  // Formatar dados para o gráfico de funil
  const chartData = [
    { name: 'Novas O.S.', value: funnel.novosChamados, fill: '#8b5cf6' },
    { name: 'Em Atendimento', value: funnel.emAtendimento, fill: '#3b82f6' },
    { name: 'Aguardando Aprovação', value: funnel.aguardandoCliente, fill: '#f59e0b' },
    { name: 'Finalizadas (Mês)', value: funnel.finalizadosMes, fill: '#10b981' }
  ];

  return (
    <div style={s.container}>
      <header style={s.header}>
        <div style={s.headerInfo}>
          <div style={s.kickerGroup}>
            <span style={s.kicker}>RevGuard AI</span>
            <span style={s.intelligenceBadge}>Módulo Revenue Intelligence</span>
          </div>
          <h1 style={s.title}>Centro de Crise Financeira</h1>
          <p style={s.subtitle}>Monitoramento de SLAs sob risco de churn e faturamento de orçamentos parados</p>
        </div>
        <div style={s.statusBadge}>
          <span style={s.dot} /> Monitoramento de Contratos Ativo
        </div>
      </header>

      {/* Grid Superior de Receita em Risco */}
      <div style={s.kpiGrid}>
        <div style={s.riskCard}>
          <div style={s.riskCardHeader}>
            <AlertTriangle color="#ef4444" size={24} style={s.pulseAlert} />
            <span style={s.riskLabel}>Receita em Risco Hoje</span>
          </div>
          <div style={s.riskValue}>{formatCurrency(receitaEmRiscoHoje)}</div>
          <p style={s.riskHint}>
            Impacto projetado baseado em SLAs de locação estourados ({kpis.kpiSlaLimitHours}h+) e orçamentos não respondidos.
          </p>
        </div>

        <div style={s.kpiCard}>
          <div style={{ ...s.kpiIcon, color: '#3b82f6' }}><Coins size={22} /></div>
          <div style={s.kpiContent}>
            <span style={s.kpiLabel}>Locações Sob Risco (MRR)</span>
            <span style={s.kpiValue}>{formatCurrency(mrrInRisk)}</span>
            <span style={s.kpiHint}>Baseado em R$ {kpis.kpiContractValue} de mensalidade média</span>
          </div>
        </div>

        <div style={s.kpiCard}>
          <div style={{ ...s.kpiIcon, color: '#f59e0b' }}><Zap size={22} /></div>
          <div style={s.kpiContent}>
            <span style={s.kpiLabel}>Orçamentos Avulsos Parados</span>
            <span style={s.kpiValue}>{formatCurrency(stalledEstimates)}</span>
            <span style={s.kpiHint}>Baseado em R$ {kpis.kpiServiceValue} por orçamento de O.S. avulsa</span>
          </div>
        </div>
      </div>

      <div style={s.mainGrid}>
        {/* Causas Raiz / Gargalos */}
        <div style={s.chartSection}>
          <div style={s.sectionHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={20} color="var(--accent)" />
              <h2 style={s.sectionTitle}>Gargalos Críticos Identificados</h2>
            </div>
            <span style={s.badge}>Sugestões de IA Disponíveis</span>
          </div>
          
          <div style={s.causesList}>
            {causas.map((causa) => (
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
            {causas.length === 0 && <p style={s.emptyHint}>Parabéns! Nenhum gargalo operacional crítico foi encontrado hoje.</p>}
          </div>
        </div>

        {/* Funil de Atendimento (Pipeline Leakage) */}
        <div style={s.chartSection}>
          <div style={s.sectionHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={20} color="#10b981" />
              <h2 style={s.sectionTitle}>Pipeline de Resolução de Chamados</h2>
            </div>
            <span style={s.badge}>Últimos 30 dias</span>
          </div>

          <div style={s.chartWrapper}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-main)' }}
                  itemStyle={{ fontSize: '12px' }}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  container: { padding: '1.5rem', background: 'var(--bg-base)', flex: 1, overflowY: 'auto', color: 'var(--text-main)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' },
  headerInfo: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  kickerGroup: { display: 'flex', alignItems: 'center', gap: '10px' },
  kicker: { color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' },
  intelligenceBadge: { background: 'var(--accent-light)', color: 'var(--accent)', fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' },
  title: { fontSize: '2rem', fontWeight: 800, margin: '4px 0 0 0', letterSpacing: '-0.02em', fontFamily: 'var(--font-display)' },
  subtitle: { color: 'var(--text-muted)', fontSize: '0.92rem' },
  statusBadge: { background: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '0.6rem 1rem', borderRadius: '100px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' },
  dot: { width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px rgba(16,185,129,0.4)' },
  
  kpiGrid: { display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' },
  riskCard: { background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '24px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 8px 32px rgba(239,68,68,0.02)' },
  riskCardHeader: { display: 'flex', alignItems: 'center', gap: '8px' },
  pulseAlert: { animation: 'pulse-alert 2s infinite' },
  riskLabel: { color: '#ef4444', fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' },
  riskValue: { fontSize: '2.4rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' },
  riskHint: { color: 'var(--text-muted)', fontSize: '0.78rem', margin: 0, lineHeight: 1.4 },
  
  kpiCard: { background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' },
  kpiIcon: { background: 'var(--bg-base)', padding: '0.75rem', borderRadius: '14px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  kpiContent: { display: 'flex', flexDirection: 'column', gap: '0.2rem' },
  kpiLabel: { color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' },
  kpiValue: { fontSize: '1.7rem', fontWeight: 900, color: 'var(--text-main)' },
  kpiHint: { color: 'var(--text-dim)', fontSize: '0.75rem' },
  
  mainGrid: { display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.5rem', marginBottom: '2.5rem' },
  chartSection: { background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: '1.05rem', fontWeight: 800, margin: 0, fontFamily: 'var(--font-display)', color: 'var(--text-main)' },
  badge: { background: 'var(--bg-base)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 700, padding: '4px 10px', borderRadius: '100px' },
  
  causesList: { display: 'flex', flexDirection: 'column', gap: '0.85rem' },
  causeRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.2rem', borderRadius: '16px', background: 'var(--bg-base)', border: '1px solid var(--border-color)', transition: 'transform 0.2s ease' },
  causeInfo: { display: 'flex', alignItems: 'center', gap: '12px' },
  priorityDot: { width: '8px', height: '8px', borderRadius: '50%' },
  causeText: { fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' },
  causeStats: { textAlign: 'right' },
  causeCount: { fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'block' },
  causeSub: { fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' },
  
  chartWrapper: { marginTop: '0.5rem' },
  loading: { padding: '2rem', color: 'var(--text-muted)' },
  emptyHint: { color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }
};
