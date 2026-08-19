import React, { useEffect, useState } from 'react';
import { getDashboardStats } from '../services/api';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertCircle, ArrowRight, Bot, Clock, MessageSquare, Star, TrendingUp, UserPlus } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';

const PERIOD_OPTIONS = [
  { value: 7, label: '7 dias' },
  { value: 30, label: '30 dias' },
  { value: 90, label: '90 dias' },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periodDays, setPeriodDays] = useState(30);

  useEffect(() => {
    load(periodDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodDays]);

  async function load(days) {
    setLoading(true);
    try {
      const { data } = await getDashboardStats(days);
      setStats(data);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-6)', background: 'var(--bg-base)', flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-6)', marginBottom: 'var(--space-10)' }}>
          {[1, 2, 3, 4].map((item) => (
            <div key={item} style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: 'var(--space-6)', height: '110px' }}>
              <div style={{ height: '12px', width: '60%', background: 'var(--bg-base)', borderRadius: '6px', marginBottom: 'var(--space-4)', animation: 'pulse-sk 1.5s infinite' }} />
              <div style={{ height: '28px', width: '40%', background: 'var(--bg-base)', borderRadius: '6px', animation: 'pulse-sk 1.5s infinite' }} />
            </div>
          ))}
        </div>
        <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '24px', height: '360px', animation: 'pulse-sk 1.5s infinite' }} />
        <style>{`
          @keyframes pulse-sk {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 0.8; }
          }
        `}</style>
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={s.errorState}>
        <AlertCircle size={28} color="var(--danger)" />
        <p style={s.errorTitle}>Não foi possível carregar o dashboard</p>
        <p style={s.errorText}>Verifique sua conexão e tente novamente.</p>
        <button type="button" style={s.retryBtn} onClick={() => load(periodDays)}>Tentar novamente</button>
      </div>
    );
  }

  const { kpis, dailyMessages, agentBreakdown, ratingsDistribution } = stats;
  const iaShare = kpis.totalMessages > 0 ? Math.round((kpis.iaMessages / kpis.totalMessages) * 100) : 0;

  return (
    <div style={s.container}>
      <PageHeader
        kicker="Visão operacional"
        title="Dashboard de performance"
        subtitle="Indicadores em tempo real para acompanhar eficiência, qualidade e capacidade da equipe."
        actions={<div style={s.statusBadge}><span style={s.dot} /> Sistema operacional</div>}
        compact
      />

      <div style={s.toolbar}>
        <div style={s.periodGroup}>
          <span style={s.periodLabel}>Período:</span>
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              style={{ ...s.periodBtn, ...(periodDays === opt.value ? s.periodBtnActive : {}) }}
              onClick={() => setPeriodDays(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div style={s.allTimeHint}>
          Desde o início: <strong>{kpis.totalMessagesAllTime.toLocaleString('pt-BR')}</strong> mensagens processadas
          ({kpis.iaMessagesAllTime.toLocaleString('pt-BR')} pela IA · {kpis.humanMessagesAllTime.toLocaleString('pt-BR')} por humanos)
        </div>
      </div>

      <div style={s.kpiGrid}>
        <KpiCard
          icon={<MessageSquare color="#8b5cf6" />}
          label="Mensagens no Período"
          value={kpis.totalMessages.toLocaleString('pt-BR')}
          hint={`${iaShare}% respondidas pela IA (${kpis.iaMessages} de ${kpis.totalMessages})`}
          accentColor="#8b5cf6"
        />
        <KpiCard
          icon={<Bot color="#D4AF37" />}
          label="Tempo Economizado"
          value={`${kpis.hoursSaved}h`}
          hint={`${kpis.iaMessages} mensagens processadas pela IA`}
          accentColor="#D4AF37"
        />
        <KpiCard
          icon={<TrendingUp color="#10b981" />}
          label="Taxa de Retenção IA"
          value={`${kpis.retentionRate}%`}
          hint="Conversas resolvidas sem humano"
          accentColor="#10b981"
        />
        <KpiCard
          icon={<Clock color="#3b82f6" />}
          label="TMA Médio"
          value={kpis.avgTMA > 60 ? `${Math.round(kpis.avgTMA / 60)}h` : `${kpis.avgTMA}m`}
          hint="Tempo médio de resolução"
          accentColor="#3b82f6"
        />
        <KpiCard
          icon={<Star color="#f59e0b" />}
          label="Satisfação (CSAT)"
          value={`${kpis.avgRating}/5`}
          hint={`Baseado em ${kpis.totalRatings} avaliações`}
          accentColor="#f59e0b"
        />
        <KpiCard
          icon={<UserPlus color="#ec4899" />}
          label="Novos Contatos"
          value={kpis.newContacts.toLocaleString('pt-BR')}
          hint={`${kpis.totalContacts.toLocaleString('pt-BR')} contatos no total`}
          accentColor="#ec4899"
        />
      </div>

      <div style={s.mainGrid} className="dashboard-main-grid">
        <div style={s.chartSection}>
          <div style={s.sectionHeader}>
            <h2 style={s.sectionTitle}>Evolução do Atendimento ({periodDays} dias)</h2>
            <div style={s.legend}>
              <div style={s.legendItem}><span style={{ ...s.legendDot, background: '#D4AF37' }} /> IA</div>
              <div style={s.legendItem}><span style={{ ...s.legendDot, background: 'var(--text-muted)' }} /> Humano</div>
            </div>
          </div>
          <div style={s.chartWrapper}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyMessages}>
                <defs>
                  <linearGradient id="colorIA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-main)' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="ia" stroke="#D4AF37" fillOpacity={1} fill="url(#colorIA)" strokeWidth={3} />
                <Area type="monotone" dataKey="human" stroke="var(--text-muted)" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={s.sidebar}>
          <div style={s.sideCard}>
            <h3 style={s.sideTitle}>Distribuição de Notas</h3>
            <div style={s.ratingDist}>
              {ratingsDistribution.slice().reverse().map((rating) => (
                <div key={rating.rating} style={s.ratingRow}>
                  <span style={s.ratingLabel}>
                    {rating.rating} <Star size={12} style={{ display: 'inline', marginBottom: '2px' }} />
                  </span>
                  <div style={s.ratingBarBg}>
                    <div style={{ ...s.ratingBar, width: `${(rating.count / (kpis.totalRatings || 1)) * 100}%` }} />
                  </div>
                  <span style={s.ratingCount}>{rating.count}</span>
                </div>
              ))}
              {kpis.totalRatings === 0 && <p style={s.emptyHint}>Nenhuma avaliação registrada ainda.</p>}
            </div>
          </div>

          <div style={s.sideCard}>
            <h3 style={s.sideTitle}>Ranking de Agentes</h3>
            <div style={s.ranking}>
              {agentBreakdown.slice(0, 5).map((agent, index) => (
                <div key={agent.id} style={s.rankItem}>
                  <div style={s.rankNum}>{index + 1}</div>
                  <div style={s.rankInfo}>
                    <div style={s.rankName}>{agent.name}</div>
                    <div style={s.rankMeta}>
                      {agent.resolvedCount} tickets · {agent.messagesCount} msgs
                      {agent.avgCsat != null && <> · ★ {agent.avgCsat}</>}
                    </div>
                  </div>
                  <ArrowRight size={14} color="var(--text-dim)" />
                </div>
              ))}
              {agentBreakdown.length === 0 && <p style={s.emptyHint}>Nenhum ticket resolvido no período selecionado.</p>}
            </div>
          </div>
        </div>
      </div>

      <div style={s.chartSection}>
        <div style={s.sectionHeader}>
          <h2 style={s.sectionTitle}>Desempenho por Atendente ({periodDays} dias)</h2>
        </div>
        {agentBreakdown.length === 0 ? (
          <p style={s.emptyHint}>Nenhuma atividade de atendente no período selecionado.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={s.agentTable}>
              <thead>
                <tr>
                  <th style={s.agentTh}>Atendente</th>
                  <th style={{ ...s.agentTh, textAlign: 'center' }}>Tickets Resolvidos</th>
                  <th style={{ ...s.agentTh, textAlign: 'center' }}>Mensagens Enviadas</th>
                  <th style={{ ...s.agentTh, textAlign: 'center' }}>TMA Médio</th>
                  <th style={{ ...s.agentTh, textAlign: 'center' }}>CSAT</th>
                </tr>
              </thead>
              <tbody>
                {agentBreakdown.map((agent) => (
                  <tr key={agent.id} style={s.agentTr}>
                    <td style={s.agentTd}><strong>{agent.name}</strong></td>
                    <td style={{ ...s.agentTd, textAlign: 'center' }}>{agent.resolvedCount}</td>
                    <td style={{ ...s.agentTd, textAlign: 'center' }}>{agent.messagesCount}</td>
                    <td style={{ ...s.agentTd, textAlign: 'center' }}>{agent.avgTma > 60 ? `${Math.round(agent.avgTma / 60)}h` : `${agent.avgTma}m`}</td>
                    <td style={{ ...s.agentTd, textAlign: 'center' }}>
                      {agent.avgCsat != null ? `★ ${agent.avgCsat} (${agent.csatCount})` : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 900px) {
          .dashboard-main-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function KpiCard({ icon, label, value, hint, accentColor }) {
  return (
    <div style={{ ...s.kpiCard, position: 'relative', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: accentColor || 'var(--accent)',
          borderRadius: '20px 20px 0 0',
        }}
      />
      <div style={s.kpiIcon}>{icon}</div>
      <div style={s.kpiContent}>
        <div style={s.kpiLabel}>{label}</div>
        <div style={s.kpiValue}>{value}</div>
        <div style={s.kpiHint}>{hint}</div>
      </div>
    </div>
  );
}

const s = {
  container: { padding: 'var(--space-6)', background: 'var(--bg-base)', flex: 1, overflowY: 'auto', color: 'var(--text-main)' },
  errorState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', minHeight: '50vh', padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-main)' },
  errorTitle: { fontSize: 'var(--text-md)', fontWeight: 700, margin: 0 },
  errorText: { fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 },
  retryBtn: { marginTop: 'var(--space-2)', padding: '0.6rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-border)', background: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 700, cursor: 'pointer', fontSize: 'var(--text-sm)' },
  statusBadge: { background: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '0.6rem 1rem', borderRadius: '100px', fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' },
  dot: { width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px rgba(16,185,129,0.4)' },
  toolbar: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' },
  periodGroup: { display: 'flex', alignItems: 'center', gap: 'var(--space-2)' },
  periodLabel: { fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginRight: '2px' },
  periodBtn: { padding: '0.4rem 0.9rem', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-color)', background: 'var(--bg-panel)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', fontWeight: 700, cursor: 'pointer' },
  periodBtnActive: { background: 'var(--accent)', borderColor: 'var(--accent)', color: 'var(--text-inverse)' },
  allTimeHint: { fontSize: 'var(--text-xs)', color: 'var(--text-dim)' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-6)', marginBottom: 'var(--space-10)' },
  kpiCard: { background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: 'var(--space-6)', display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' },
  kpiIcon: { background: 'var(--bg-base)', padding: 'var(--space-3)', borderRadius: '12px', border: '1px solid var(--border-color)' },
  kpiContent: { display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 0 },
  kpiLabel: { color: 'var(--text-muted)', fontSize: 'var(--text-xs)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' },
  kpiValue: { fontSize: 'var(--text-2xl)', fontWeight: 900, margin: '4px 0', color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums' },
  kpiHint: { color: 'var(--text-dim)', fontSize: 'var(--text-xs)' },
  mainGrid: { display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' },
  chartSection: { background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: 'var(--space-8)', minWidth: 0 },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-8)', flexWrap: 'wrap', gap: 'var(--space-3)' },
  sectionTitle: { fontSize: 'var(--text-lg)', fontWeight: 800, margin: 0, fontFamily: 'var(--font-display)' },
  legend: { display: 'flex', gap: 'var(--space-6)' },
  legendItem: { fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' },
  legendDot: { width: '8px', height: '8px', borderRadius: '50%' },
  chartWrapper: { marginTop: 'var(--space-4)' },
  sidebar: { display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', minWidth: 0 },
  sideCard: { background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: 'var(--space-6)' },
  sideTitle: { fontSize: 'var(--text-sm)', fontWeight: 800, marginBottom: 'var(--space-6)', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  ratingDist: { display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' },
  ratingRow: { display: 'flex', alignItems: 'center', gap: 'var(--space-3)' },
  ratingLabel: { fontSize: 'var(--text-xs)', color: 'var(--text-muted)', minWidth: '30px' },
  ratingBarBg: { flex: 1, height: '6px', background: 'var(--bg-base)', borderRadius: '3px', overflow: 'hidden' },
  ratingBar: { height: '100%', background: '#f59e0b', borderRadius: '3px' },
  ratingCount: { fontSize: 'var(--text-xs)', color: 'var(--text-dim)', minWidth: '20px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
  ranking: { display: 'flex', flexDirection: 'column', gap: '0.85rem' },
  rankItem: { display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.9rem 1rem', borderRadius: '16px', background: 'var(--bg-base)', border: '1px solid var(--border-color)' },
  rankNum: { width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent)', color: 'var(--text-inverse)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.85rem' },
  rankInfo: { flex: 1, minWidth: 0 },
  rankName: { fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  rankMeta: { fontSize: 'var(--text-xs)', color: 'var(--text-muted)' },
  emptyHint: { color: 'var(--text-muted)', fontSize: 'var(--text-sm)', margin: 0 },
  agentTable: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: 'var(--space-4)' },
  agentTh: { padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border-color)' },
  agentTr: { borderBottom: '1px solid var(--border-color)' },
  agentTd: { padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums' },
};
