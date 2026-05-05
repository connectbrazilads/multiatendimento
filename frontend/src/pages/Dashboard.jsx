import React, { useEffect, useState } from 'react';
import { getDashboardStats } from '../services/api';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { Star, TrendingUp, Users, Clock, MessageSquare, Bot, ArrowRight, ShieldCheck } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const { data } = await getDashboardStats();
      setStats(data);
    } catch (e) {
      console.error('Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div style={s.loading}>Analizando performance da operação...</div>;
  if (!stats) return <div style={s.loading}>Erro ao carregar dados do dashboard.</div>;

  const { kpis, dailyMessages, agentRanking, ratingsDistribution } = stats;

  return (
    <div style={s.container}>
      <header style={s.header}>
        <div style={s.headerInfo}>
          <h1 style={s.title}>📊 Dashboard de Performance</h1>
          <p style={s.subtitle}>Insights em tempo real sobre a eficiência da sua operação</p>
        </div>
        <div style={s.statusBadge}>
          <span style={s.dot} /> Sistema Operacional
        </div>
      </header>

      {/* KPI Cards */}
      <div style={s.kpiGrid}>
        <KpiCard 
          icon={<Bot color="#D4AF37" />} 
          label="Tempo Economizado" 
          value={`${kpis.hoursSaved}h`} 
          hint={`${kpis.iaMessages} mensagens processadas pela IA`} 
        />
        <KpiCard 
          icon={<TrendingUp color="#10b981" />} 
          label="Taxa de Retenção IA" 
          value={`${kpis.retentionRate}%`} 
          hint="Conversas resolvidas sem humano" 
        />
        <KpiCard 
          icon={<Clock color="#3b82f6" />} 
          label="TMA Médio" 
          value={kpis.avgTMA > 60 ? `${Math.round(kpis.avgTMA / 60)}h` : `${kpis.avgTMA}m`} 
          hint="Tempo médio de resolução" 
        />
        <KpiCard 
          icon={<Star color="#f59e0b" />} 
          label="Satisfação (CSAT)" 
          value={`${kpis.avgRating}/5`} 
          hint={`Baseado em ${kpis.totalRatings} avaliações`} 
        />
      </div>

      <div style={s.mainGrid}>
        {/* Chart Section */}
        <div style={s.chartSection}>
          <div style={s.sectionHeader}>
            <h2 style={s.sectionTitle}>📈 Evolução do Atendimento (7 dias)</h2>
            <div style={s.legend}>
              <div style={s.legendItem}><span style={{ ...s.legendDot, background: '#D4AF37' }} /> IA</div>
              <div style={s.legendItem}><span style={{ ...s.legendDot, background: '#717171' }} /> Humano</div>
            </div>
          </div>
          <div style={s.chartWrapper}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyMessages}>
                <defs>
                  <linearGradient id="colorIA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-main)' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="ia" stroke="var(--accent)" fillOpacity={1} fill="url(#colorIA)" strokeWidth={3} />
                <Area type="monotone" dataKey="human" stroke="var(--text-muted)" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Sidebar */}
        <div style={s.sidebar}>
          <div style={s.sideCard}>
            <h3 style={s.sideTitle}>⭐ Distribuição de Notas</h3>
            <div style={s.ratingDist}>
              {ratingsDistribution.slice().reverse().map(r => (
                <div key={r.rating} style={s.ratingRow}>
                  <span style={s.ratingLabel}>{r.rating} <Star size={12} style={{ display: 'inline', marginBottom: '2px' }} /></span>
                  <div style={s.ratingBarBg}>
                    <div style={{ ...s.ratingBar, width: `${(r.count / (kpis.totalRatings || 1)) * 100}%` }} />
                  </div>
                  <span style={s.ratingCount}>{r.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={s.sideCard}>
            <h3 style={s.sideTitle}>🏆 Ranking de Agentes</h3>
            <div style={s.ranking}>
              {agentRanking.map((a, i) => (
                <div key={i} style={s.rankItem}>
                  <div style={s.rankNum}>{i + 1}</div>
                  <div style={s.rankInfo}>
                    <div style={s.rankName}>{a.name}</div>
                    <div style={s.rankMeta}>{a.count} tickets resolvidos</div>
                  </div>
                  <ArrowRight size={14} color="#333" />
                </div>
              ))}
              {agentRanking.length === 0 && <p style={s.emptyHint}>Nenhum ticket resolvido ainda.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, hint }) {
  return (
    <div style={s.kpiCard}>
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
  container: { padding: '2.5rem', background: 'var(--bg-base)', flex: 1, overflowY: 'auto', color: 'var(--text-main)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' },
  headerInfo: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  title: { fontSize: '2rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' },
  subtitle: { color: 'var(--text-muted)', fontSize: '1rem' },
  statusBadge: { background: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '0.6rem 1rem', borderRadius: '100px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' },
  dot: { width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px rgba(16,185,129,0.4)' },

  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' },
  kpiCard: { background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' },
  kpiIcon: { background: 'var(--bg-base)', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border-color)' },
  kpiLabel: { color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' },
  kpiValue: { fontSize: '1.8rem', fontWeight: 900, margin: '4px 0', color: 'var(--text-main)' },
  kpiHint: { color: 'var(--text-dim)', fontSize: '0.75rem' },

  mainGrid: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem' },
  chartSection: { background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '2rem' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
  sectionTitle: { fontSize: '1.1rem', fontWeight: 800, margin: 0 },
  legend: { display: 'flex', gap: '1.5rem' },
  legendItem: { fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' },
  legendDot: { width: '8px', height: '8px', borderRadius: '50%' },
  chartWrapper: { marginTop: '1rem' },

  sidebar: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  sideCard: { background: 'var(--bg-panel)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '1.5rem' },
  sideTitle: { fontSize: '0.9rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' },

  ratingDist: { display: 'flex', flexDirection: 'column', gap: '12px' },
  ratingRow: { display: 'flex', alignItems: 'center', gap: '12px' },
  ratingLabel: { fontSize: '0.8rem', color: 'var(--text-muted)', minWidth: '30px' },
  ratingBarBg: { flex: 1, height: '6px', background: 'var(--bg-base)', borderRadius: '3px', overflow: 'hidden' },
  ratingBar: { height: '100%', background: '#f59e0b', borderRadius: '3px' },
  ratingCount: { fontSize: '0.8rem', color: 'var(--text-dim)', minWidth: '20px', textAlign: 'right' },

  ranking: { display: 'flex', flexDirection: 'column', gap: '12px' },
  rankItem: { display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-base)', padding: '12px', borderRadius: '16px', border: '1px solid var(--border-color)' },
  rankNum: { width: '28px', height: '28px', borderRadius: '8px', background: 'var(--bg-panel)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent)' },
  rankName: { fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' },
  rankMeta: { fontSize: '0.75rem', color: 'var(--text-muted)' },
  emptyHint: { fontSize: '0.8rem', color: 'var(--text-dim)', textAlign: 'center', padding: '1rem' },

  loading: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', background: 'var(--bg-surface)' }
};
